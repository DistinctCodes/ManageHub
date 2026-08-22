import { Logger } from '@nestjs/common';
import { SorobanRpc } from '@stellar/stellar-sdk';
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

export function createSorobanRpcServer(url: string): SorobanRpcServerLike {
  return new SorobanRpc.Server(url, {
    allowHttp: url.startsWith('http://'),
  }) as unknown as SorobanRpcServerLike;
}

const RETRYABLE_SEND_STATUSES = new Set(['TRY_AGAIN_LATER']);

/**
 * RPC resilience (issue #1574): tries each configured endpoint in order,
 * with retry/backoff (reusing #1572's utility) on transient failures
 * within an endpoint before failing over to the next one. A endpoint that
 * is simply down (connection error) fails over immediately rather than
 * exhausting its retry budget.
 */
export class SorobanRpcClient {
  private readonly logger = new Logger(SorobanRpcClient.name);

  constructor(private readonly servers: SorobanRpcServerLike[]) {
    if (servers.length === 0) {
      throw new Error('SorobanRpcClient needs at least one RPC endpoint');
    }
  }

  getAccount(publicKey: string): Promise<any> {
    return this.withFailover((server) => server.getAccount(publicKey));
  }

  simulateTransaction(tx: any): Promise<any> {
    return this.withFailover((server) => server.simulateTransaction(tx));
  }

  sendTransaction(tx: any): Promise<any> {
    return this.withFailover(async (server) => {
      const result = await server.sendTransaction(tx);
      if (RETRYABLE_SEND_STATUSES.has(result?.status)) {
        throw new TransientRpcError(`sendTransaction status ${result.status}`);
      }
      return result;
    });
  }

  getTransaction(hash: string): Promise<any> {
    return this.withFailover((server) => server.getTransaction(hash));
  }

  private async withFailover<T>(
    call: (server: SorobanRpcServerLike) => Promise<T>,
  ): Promise<T> {
    let lastError: unknown;
    for (const [index, server] of this.servers.entries()) {
      try {
        return await retryWithBackoff((attempt) => call(server), {
          maxAttempts: index === this.servers.length - 1 ? 3 : 2,
          baseDelayMs: 200,
          maxDelayMs: 2000,
          isRetryable: (error) => error instanceof TransientRpcError,
        });
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Soroban RPC endpoint ${index + 1}/${this.servers.length} failed: ` +
            (error instanceof Error ? error.message : String(error)),
        );
      }
    }
    throw lastError;
  }
}

export class TransientRpcError extends Error {}
