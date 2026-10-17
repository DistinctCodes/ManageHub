/**
 * Sampling helpers shared by the three Sentry configs (client, server, edge)
 * so their defaults cannot drift apart (issue #1987).
 */

/**
 * Parses a sampling-rate env var. Returns the fallback when the value is
 * missing, not a number, or outside [0, 1].
 */
export function getSampleRate(value: string | undefined, fallback: number): number {
  if (!value) return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1
    ? parsed
    : fallback;
}

/**
 * Default trace sampling when NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE is not
 * set: 100% in development (cheap, everything is local) and 10% by default in
 * production so one forgotten deployment cannot exhaust the Sentry quota.
 * Applications that want full tracing in production opt in explicitly.
 */
export function defaultTracesSampleRate(): number {
  return process.env.NODE_ENV === "production" ? 0.1 : 1.0;
}
