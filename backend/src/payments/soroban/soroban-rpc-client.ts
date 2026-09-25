import { Logger } from '@nestjs/common';
import { withSpan } from '../../common/tracing';
import { SorobanRpc } from '@stellar/stellar-sdk';
import {
  outboundRequestHeaders,
  withRequestId,
} from '../../common/request-context';
import { TimeoutError, withTimeout } from '../utils/with-timeout';
import { retryWithBackoff } from '../utils/retry-with-backoff';

/**
 * The subset of SorobanRpc.Server's surface this module uses. Typed loosely
 * (return values are `any`) deliberately: this is the one seam where we
 * touch the SDK's RPC types directly, so a minor-version shape change
 * shows up here, not scattered across every caller.
 */
export interface SorobanRpcServerLike {
  getAccount(publicKey: string): Promise<any>;
  simulateTransaction(tx: any): Promise<any>;
  sendTransaction(tx: any): Promise<any>;
  getTransaction(hash: string): Promise<any>;
}

interface SdkAxiosClientLike {
  interceptors?: {
    request?: {
      use: (handler: (config: any) => any) => unknown;
    };
  };
}

let requestIdInterceptorInstalled = false;

export const DEFAULT_SOROBAN_RPC_TIMEOUT_MS = 10_000;

/**
 * SDK 11.3 accepts static `headers` on `SorobanRpc.Server` and exports the
 * Axios client used by its JSON-RPC transport. The servers in this module are
 * created during application bootstrap, before an HTTP request context can
 * exist, so constructor headers alone cannot carry an AsyncLocalStorage id.
 * A single interceptor on that exported client supplies the current context
 * at actual request time instead. If a future SDK removes that export, the
 * type guard below simply leaves the SDK untouched; Soroban client logs still
 * carry the id through `withRequestId`, while third-party transport-level
 * propagation is explicitly unavailable rather than guessed.
 */
function installRequestIdHeaderInterceptor(): void {
  if (requestIdInterceptorInstalled) {
    return;
  }

  const sdkAxiosClient = (
    SorobanRpc as unknown as { AxiosClient?: SdkAxiosClientLike }
  ).AxiosClient;
  const requestInterceptor = sdkAxiosClient?.interceptors?.request;
  if (!requestInterceptor || typeof requestInterceptor.use !== 'function') {
    return;
  }

  try {
    requestInterceptor.use((config: any) => {
      const headers = outboundRequestHeaders();
      if (Object.keys(headers).length === 0) {
        return config;
      }
      config.headers = config.headers ?? {};
      Object.assign(config.headers, headers);
      return config;
    });
    requestIdInterceptorInstalled = true;
  } catch {
    return;
  }
}

/**
 * Creates one SDK RPC server and attaches the request-correlation mechanism
 * supported by the pinned SDK. The `headers` option is retained for SDK
 * versions that apply constructor headers directly; the interceptor above is
 * what makes those headers reflect the active request rather than bootstrap
 * state. Neither path emits an empty or placeholder id.
 */
export function createSorobanRpcServer(url: string): SorobanRpcServerLike {
  installRequestIdHeaderInterceptor();
  // Assigned to a variable before the call so TypeScript's excess-property
  // check never runs: the correlation header is a forward-compatible extra
  // that older SDK typings simply do not declare, and a literal inline here
  // would fail the build if `headers` is absent from the pinned options type.
  const options = {
    allowHttp: url.startsWith('http://'),
    headers: outboundRequestHeaders(),
  } as ConstructorParameters<typeof SorobanRpc.Server>[1];
  return new SorobanRpc.Server(url, options) as unknown as SorobanRpcServerLike;
}

const RETRYABLE_SEND_STATUSES = new Set(['TRY_AGAIN_LATER']);

/** A transient endpoint failure that may be retried or failed over. */
export class TransientRpcError extends Error {}

/**
 * A bounded RPC call is indeterminate rather than a terminal provider error.
 * The endpoint may still complete the request after our timer fires, so it is
 * treated like a connection outage: retry within that endpoint's budget and
 * then try the next configured endpoint.
 */
export class SorobanRpcTimeoutError extends TransientRpcError {
  constructor(
    readonly endpointIndex: number,
    readonly endpointCount: number,
    readonly timeoutMs: number,
  ) {
    super(
      `Soroban RPC endpoint ${endpointIndex}/${endpointCount} timed out after ${timeoutMs}ms`,
    );
    this.name = 'SorobanRpcTimeoutError';
  }
}

/**
 * Parses the constructor/environment timeout without accepting fractional or
 * unsafe millisecond values. `undefined`, `null`, and an empty environment
 * value select the documented default; malformed explicit values fail fast
 * during module construction rather than creating an unbounded client.
 */
export function parseSorobanRpcTimeoutMs(value: unknown): number {
  if (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return DEFAULT_SOROBAN_RPC_TIMEOUT_MS;
  }

  let parsed: number;
  if (typeof value === 'number') {
    parsed = value;
  } else if (typeof value === 'string') {
    parsed = Number(value);
  } else {
    parsed = Number.NaN;
  }
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(
      `SOROBAN_RPC_TIMEOUT_MS must be a positive safe integer, got ${String(value)}`,
    );
  }
  return parsed;
}

/**
 * RPC resilience (issue #1574): tries each configured endpoint in order,
 * with retry/backoff (reusing #1572's utility) on transient failures within
 * an endpoint before failing over to the next one. Every call is wrapped in
 * the shared timeout utility, so a hung endpoint cannot hold a request
 * forever. A timed-out endpoint is logged as transient and is retried and
 * failed over exactly like a connection error.
 */
export class SorobanRpcClient {
  private readonly logger = new Logger(SorobanRpcClient.name);
  private readonly timeoutMs: number;

  constructor(
    private readonly servers: SorobanRpcServerLike[],
    timeoutMs: number = DEFAULT_SOROBAN_RPC_TIMEOUT_MS,
  ) {
    if (servers.length === 0) {
      throw new Error('SorobanRpcClient needs at least one RPC endpoint');
    }
    this.timeoutMs = parseSorobanRpcTimeoutMs(timeoutMs);
  }

  getAccount(publicKey: string): Promise<any> {
    return withSpan('soroban.rpc.get-account', () =>
      this.withFailover((server) => server.getAccount(publicKey)),
    );
  }

  simulateTransaction(tx: any): Promise<any> {
    return withSpan('soroban.rpc.simulate-transaction', () =>
      this.withFailover((server) => server.simulateTransaction(tx)),
    );
  }

  sendTransaction(tx: any): Promise<any> {
    return withSpan('soroban.rpc.send-transaction', () =>
      this.withFailover(async (server) => {
        const result = await server.sendTransaction(tx);
        if (RETRYABLE_SEND_STATUSES.has(result?.status)) {
          throw new TransientRpcError(
            `sendTransaction status ${result.status}`,
          );
        }
        return result;
      }),
    );
  }

  getTransaction(hash: string): Promise<any> {
    return withSpan('soroban.rpc.get-transaction', () =>
      this.withFailover((server) => server.getTransaction(hash)),
    );
  }

  private async withFailover<T>(
    call: (server: SorobanRpcServerLike) => Promise<T>,
  ): Promise<T> {
    let lastError: unknown;
    for (const [index, server] of this.servers.entries()) {
      try {
        return await retryWithBackoff(
          () => this.callWithTimeout(call, server, index),
          {
            maxAttempts: index === this.servers.length - 1 ? 3 : 2,
            baseDelayMs: 200,
            maxDelayMs: 2000,
            isRetryable: (error) => error instanceof TransientRpcError,
          },
        );
      } catch (error) {
        lastError = error;
        this.logger.warn(
          withRequestId(
            `Soroban RPC endpoint ${index + 1}/${this.servers.length} failed: ` +
              (error instanceof Error ? error.message : String(error)),
          ),
        );
      }
    }
    throw lastError;
  }

  private async callWithTimeout<T>(
    call: (server: SorobanRpcServerLike) => Promise<T>,
    server: SorobanRpcServerLike,
    index: number,
  ): Promise<T> {
    try {
      return await withTimeout(call(server), this.timeoutMs);
    } catch (error) {
      if (error instanceof TimeoutError) {
        const timeoutError = new SorobanRpcTimeoutError(
          index + 1,
          this.servers.length,
          this.timeoutMs,
        );
        this.logger.warn(
          withRequestId(
            `${timeoutError.message}; treating the endpoint as transient and failing over`,
          ),
        );
        throw timeoutError;
      }
      throw error;
    }
  }
}
