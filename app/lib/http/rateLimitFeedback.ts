/**
 * Rate-limit UI feedback helpers (#1869).
 *
 * The UI showed no feedback when the backend returned HTTP 429. These helpers
 * let callers detect a rate-limit response and render a consistent message,
 * honouring a `Retry-After` value when one is provided.
 */

/** Whether an HTTP status represents a rate-limit response. */
export function isRateLimited(status: number): boolean {
  return status === 429;
}

/** Build a user-facing message for a 429 response. */
export function rateLimitMessage(retryAfterSeconds?: number): string {
  if (typeof retryAfterSeconds === "number" && retryAfterSeconds > 0) {
    return `Too many requests. Please try again in ${retryAfterSeconds}s.`;
  }
  return "Too many requests. Please try again shortly.";
}
