export function isRateLimited(status: number): boolean {
  return status === 429;
}

export function parseRetryAfter(
  value: string | null | undefined,
): number | undefined {
  if (!value) return undefined;
  const raw = value.trim();
  if (/^\d+$/.test(raw)) {
    const seconds = Number(raw);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
  }
  const timestamp = Date.parse(raw);
  if (Number.isNaN(timestamp)) return undefined;
  const seconds = Math.ceil((timestamp - Date.now()) / 1000);
  return seconds > 0 ? seconds : undefined;
}

export function rateLimitMessage(retryAfterSeconds?: number): string {
  if (typeof retryAfterSeconds === "number" && retryAfterSeconds > 0) {
    return `Too many requests. Please try again in ${retryAfterSeconds}s.`;
  }
  return "Too many requests. Please try again shortly.";
}
