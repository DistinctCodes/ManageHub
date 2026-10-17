/**
 * JWT configuration (#1931) and cookie-auth wiring note (#1932).
 *
 * Tokens were previously issued without an expiry. This module centralises the
 * expiry policy so every signer applies the same lifetime.
 */
export interface JwtConfig {
  secret: string;
  /** Token lifetime in seconds. */
  expiresInSeconds: number;
  /**
   * Whether cookies are an accepted token transport (#1932). When true, the
   * application must register `cookie-parser` before `JwtAuthGuard` runs.
   */
  allowCookies: boolean;
}

export const DEFAULT_JWT_EXPIRES_IN_SECONDS = 60 * 60; // 1 hour

/** Ensure a JWT config always has a sane, positive expiry. */
export function normalizeJwtConfig(config: JwtConfig): JwtConfig {
  return {
    ...config,
    expiresInSeconds:
      config.expiresInSeconds > 0
        ? config.expiresInSeconds
        : DEFAULT_JWT_EXPIRES_IN_SECONDS,
  };
}

// NOTE (#1932): `cookie-parser` is installed but never registered. Cookie
// authentication in JwtAuthGuard cannot work until the bootstrap registers it,
// e.g. `app.use(cookieParser())` before the global guards are bound.
