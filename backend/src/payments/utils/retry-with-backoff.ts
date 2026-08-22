/**
 * Shared retry/backoff utility (issue #1572) for our own outbound provider
 * calls (refund, verify) — exponential backoff with jitter, a hard cap on
 * attempts, and a caller-supplied distinction between retryable errors
 * (timeout/5xx) and terminal ones (4xx), so a terminal error fails fast
 * instead of burning through the full attempt budget.
 */
export interface RetryOptions {
  /** Total attempts, including the first — must be >= 1. */
  maxAttempts: number;
  /** Delay before the 2nd attempt; doubles each attempt after that. */
  baseDelayMs: number;
  /** Upper bound on the (pre-jitter) delay, however many attempts have passed. */
  maxDelayMs?: number;
  /** Defaults to "retry everything" — pass this to stop early on a terminal error. */
  isRetryable?: (error: unknown) => boolean;
  /** Injectable for tests — defaults to a real setTimeout-based sleep. */
  sleep?: (ms: number) => Promise<void>;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retryWithBackoff<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const {
    maxAttempts,
    baseDelayMs,
    maxDelayMs = Number.POSITIVE_INFINITY,
    isRetryable = () => true,
    sleep = defaultSleep,
  } = options;

  if (maxAttempts < 1) {
    throw new Error('retryWithBackoff: maxAttempts must be >= 1');
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === maxAttempts;
      if (isLastAttempt || !isRetryable(error)) {
        throw error;
      }
      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      const jitter = delay * 0.1 * Math.random();
      await sleep(delay + jitter);
    }
  }

  // Unreachable — the loop above always either returns or throws — but
  // keeps the compiler happy about a guaranteed return type.
  throw lastError;
}
