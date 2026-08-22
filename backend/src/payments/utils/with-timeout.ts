export class TimeoutError extends Error {}

/**
 * Bounds a provider call to `timeoutMs` — the verify-on-return fast path
 * (issue #1571) must never hang waiting on a slow/unresponsive provider;
 * a timeout is not an error to propagate, it's a signal to fall back to
 * the webhook/real-time channel instead.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(`Timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error as Error);
      },
    );
  });
}
