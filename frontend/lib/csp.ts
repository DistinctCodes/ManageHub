/**
 * Baseline Content-Security-Policy for the frontend (issue #1868).
 *
 * Applied to every route via `headers()` in next.config.ts. The policy is
 * built from the same NEXT_PUBLIC_* variables the app already uses, so it is
 * resolved at build time alongside them:
 * - connect-src allows the backend API origin and the Sentry ingest origin
 *   (derived from NEXT_PUBLIC_SENTRY_DSN) in addition to 'self';
 * - script-src keeps 'unsafe-inline' because the App Router emits inline
 *   bootstrap scripts and this app does not yet issue per-request nonces;
 *   development additionally needs 'unsafe-eval' (React Refresh) and ws: for
 *   the HMR socket.
 * Fonts are self-hosted by next/font, so no third-party font origins are
 * needed.
 */

interface CspEnv {
  NODE_ENV?: string;
  NEXT_PUBLIC_API_URL?: string;
  NEXT_PUBLIC_SENTRY_DSN?: string;
}

const DEV_API_ORIGIN = "http://localhost:6000";

/** Origin (scheme://host[:port]) of an http(s) URL, or null when invalid. */
export function toOrigin(value: string | undefined): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function buildContentSecurityPolicy(env: CspEnv = process.env): string {
  const isDev = env.NODE_ENV === "development";

  const apiOrigin =
    toOrigin(env.NEXT_PUBLIC_API_URL) ?? (isDev ? DEV_API_ORIGIN : null);
  const sentryOrigin = toOrigin(env.NEXT_PUBLIC_SENTRY_DSN);

  const connectSrc = ["'self'"];
  if (apiOrigin) connectSrc.push(apiOrigin);
  if (sentryOrigin) connectSrc.push(sentryOrigin);
  if (isDev) connectSrc.push("ws:", "wss:");

  const scriptSrc = ["'self'", "'unsafe-inline'"];
  if (isDev) scriptSrc.push("'unsafe-eval'");

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": scriptSrc,
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'", "data:"],
    "connect-src": connectSrc,
    // Sentry session replay runs its compression worker from a blob: URL.
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  const policy = Object.entries(directives).map(
    ([name, sources]) => `${name} ${sources.join(" ")}`,
  );
  if (!isDev) policy.push("upgrade-insecure-requests");

  return policy.join("; ");
}

export function securityHeaders(
  env: CspEnv = process.env,
): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy(env) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
  ];
}
