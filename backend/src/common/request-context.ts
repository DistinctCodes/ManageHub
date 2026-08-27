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

export function withRequestId(message: string): string {
  const requestId = currentRequestId();
  return requestId ? `[request:${requestId}] ${message}` : message;
}
