import { Request } from 'express';

// Extracts the IP and User-Agent for an admin-action-log entry so audit
// records carry forensic context about where the request came from.
export interface RequestMetadata {
  ip: string | null;
  userAgent: string | null;
}

export function extractRequestMetadata(req: Request): RequestMetadata {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip =
    (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0]?.trim()) ||
    req.socket?.remoteAddress ||
    req.ip ||
    null;

  const userAgent = req.headers['user-agent'] ?? null;

  return { ip, userAgent: userAgent as string | null };
}
