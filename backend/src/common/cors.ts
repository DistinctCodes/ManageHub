/**
 * Origins used by the local frontend during development and automated tests.
 *
 * Keep the development defaults together so a change to the documented local
 * frontend ports cannot accidentally make one environment more permissive
 * than the other.
 */
export const DEVELOPMENT_AND_TEST_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
] as const;

/**
 * Parse a comma-separated CORS_ORIGINS value into exact origins.
 *
 * Whitespace around entries is insignificant, and empty entries are ignored
 * so a trailing comma cannot accidentally broaden or confuse the allowlist.
 */
export function parseAllowedOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/**
 * Resolve the CORS allowlist using the explicit configuration first and the
 * environment-specific safe default second.
 *
 * Development and test may use the two local frontend origins when no value
 * is configured. Every other environment, including production, resolves to
 * an empty allowlist when CORS_ORIGINS is missing or empty so a deployment
 * fails closed rather than inheriting a wildcard policy.
 */
export function resolveAllowedOrigins(env: NodeJS.ProcessEnv): string[] {
  const configuredOrigins = parseAllowedOrigins(env.CORS_ORIGINS);
  if (configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
    return [...DEVELOPMENT_AND_TEST_CORS_ORIGINS];
  }

  return [];
}

/**
 * Decide whether a request origin may receive credentialed CORS headers.
 *
 * Requests without an Origin header are deliberately allowed: they are
 * same-origin/non-browser clients, curl, or health checkers rather than a
 * browser cross-origin request. Present origins must match one exact entry.
 */
export function isOriginAllowed(
  origin: string | undefined,
  allowedOrigins: readonly string[],
): boolean {
  return !origin || allowedOrigins.includes(origin);
}
