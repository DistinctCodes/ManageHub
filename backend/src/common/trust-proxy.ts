/**
 * Resolves Express's "trust proxy" setting from TRUST_PROXY (issue #1955).
 *
 * Behind a reverse proxy or load balancer the socket address Express sees is
 * the proxy's, so the global ThrottlerGuard would key its (now Redis-shared)
 * counters on the proxy IP and every client would share one bucket. Setting
 * TRUST_PROXY makes Express take the client IP from X-Forwarded-For instead.
 *
 * The default is `false` (no proxy trusted) deliberately: when the app is
 * directly exposed, trusting X-Forwarded-For would let any client spoof the
 * header and rotate through fresh rate-limit buckets.
 *
 * Accepted values:
 * - unset / empty / "false" / "0"  -> false (direct exposure, the default)
 * - "true" / "1"                   -> true / 1 (trust the immediate peer)
 * - any integer                    -> that many proxy hops
 * - anything else                  -> passed through verbatim (Express
 *                                     accepts e.g. "loopback", "10.0.0.0/8")
 */
export type TrustProxyValue = boolean | number | string;

export function resolveTrustProxy(
  env: Record<string, string | undefined> = process.env,
): TrustProxyValue {
  const raw = env.TRUST_PROXY?.trim();
  if (!raw) {
    return false;
  }
  if (/^\d+$/.test(raw)) {
    return Number(raw);
  }
  const normalized = raw.toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }
  return raw;
}
