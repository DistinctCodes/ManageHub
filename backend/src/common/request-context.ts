import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextState {
  requestId: string;
}

const requestContext = new AsyncLocalStorage<RequestContextState>();

export function runWithRequestContext<T>(
  state: RequestContextState,
  handler: () => T,
): T {
  return requestContext.run(state, handler);
}

export function currentRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

/**
 * Builds the correlation headers for an outbound call made by the current
 * request. The middleware already accepts `x-request-id` and
 * `x-correlation-id` as inbound headers, so sending both names lets the
 * identifier survive a full round trip through services that choose either
 * convention. An empty object is returned when no request context is active;
 * callers must not manufacture a placeholder identifier for background work
 * or for code running outside an HTTP request. This helper can populate only
 * an API that accepts custom headers; a provider that discards or does not
 * expose them cannot be made traceable by adding fields to this object.
 */
export function outboundRequestHeaders(): Record<string, string> {
  const requestId = currentRequestId();
  if (!requestId) {
    return {};
  }
  return {
    'x-request-id': requestId,
    'x-correlation-id': requestId,
  };
}

export function withRequestId(message: string): string {
  const requestId = currentRequestId();
  return requestId ? `[request:${requestId}] ${message}` : message;
}
