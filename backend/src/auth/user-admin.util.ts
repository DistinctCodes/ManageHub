import { randomBytes } from 'crypto';

/** #2104: build a paginated admin user search (email/name contains q). */
export function buildUserSearch(q?: string, page = 1, pageSize = 20) {
  const take = Math.min(100, Math.max(1, pageSize));
  const skip = (Math.max(1, page) - 1) * take;
  const term = q?.trim().toLowerCase();
  return { term: term ? `%${term}%` : undefined, skip, take };
}

/** #2105: create a one-time email verification token valid for 24h. */
export function createEmailVerification(ttlHours = 24) {
  return {
    token: randomBytes(32).toString('hex'),
    expiresAt: new Date(Date.now() + ttlHours * 3_600_000),
  };
}
