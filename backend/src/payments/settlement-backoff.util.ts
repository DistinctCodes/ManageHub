// Exponential backoff with jitter for settlement.service.ts retries, so
// a failing downstream dependency isn't hammered during an incident.
export interface BackoffOptions {
  baseMs?: number;
  maxMs?: number;
  maxAttempts?: number;
}

export function computeSettlementBackoffMs(
  attempt: number,
  options: BackoffOptions = {},
): number {
  const { baseMs = 500, maxMs = 30_000 } = options;
  const exponential = Math.min(baseMs * 2 ** attempt, maxMs);
  const jitter = Math.random() * exponential * 0.25;
  return Math.round(exponential + jitter);
}

export function hasExceededMaxAttempts(
  attempt: number,
  options: BackoffOptions = {},
): boolean {
  const { maxAttempts = 5 } = options;
  return attempt >= maxAttempts;
}
