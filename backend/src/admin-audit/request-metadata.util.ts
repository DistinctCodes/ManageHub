import { Request } from 'express';

// Extracts the IP and User-Agent for an admin-action-log entry so audit
// records carry forensic context about where the request came from.
export interface RequestMetadata {
  ip: string | null;
  userAgent: string | null;
}

/**
 * Whether Express is configured to trust a front proxy for this request.
 * Only then may the client-supplied `X-Forwarded-For` header be believed;
 * otherwise it is attacker-controlled and must be ignored in favour of the
 * transport-level peer address.
 */
function isTrustProxyEnabled(req: Request): boolean {
  const app = req?.app;
  if (!app || typeof app.get !== 'function') {
    return false;
  }
  let setting: unknown;
  try {
    setting = app.get('trust proxy');
  } catch {
    return false;
  }
  if (setting === true) {
    return true;
  }
  if (typeof setting === 'number') {
    return setting > 0;
  }
  if (typeof setting === 'string') {
    return setting !== '' && setting !== 'false';
  }
  return false;
}

export function extractRequestMetadata(req: Request): RequestMetadata {
  const headers = req?.headers ?? {};

  const userAgentHeader = headers['user-agent'];
  const userAgent = Array.isArray(userAgentHeader)
    ? (userAgentHeader[0] ?? null)
    : (userAgentHeader ?? null);

  const forwardedFor = headers['x-forwarded-for'];
  const forwardedIp = (
    Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor
  )
    ?.split(',')[0]
    ?.trim();

  // `req.ip` is the value Express itself resolved against the app's
  // `trust proxy` setting, so it is preferred. `X-Forwarded-For` is only
  // consulted when a trusted proxy is configured; a direct request falls
  // back to the socket peer address.
  const ip =
    req?.ip ||
    (isTrustProxyEnabled(req) ? forwardedIp : null) ||
    req?.socket?.remoteAddress ||
    null;

  return { ip: ip || null, userAgent: userAgent || null };
}
