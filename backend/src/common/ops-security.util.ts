/** #2075: AppController's /metrics must not bypass MetricsAuthGuard; only MetricsController serves it. */
export const METRICS_ROUTE_OWNER = 'MetricsController';

/** #2076: hide raw driver errors from the public /health/dependencies response. */
export function publicDependencyStatus(err?: unknown): { status: 'up' | 'down' } {
  return { status: err ? 'down' : 'up' };
}

/** #2077: access tokens must always expire; default to 15 minutes. */
export function resolveJwtExpiresIn(value = process.env.JWT_EXPIRES_IN): string {
  return value && value.trim() ? value.trim() : '15m';
}
