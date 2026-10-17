/**
 * Login lockout and password-reset scaffolding (#1933, #1934).
 *
 * The repository ships an account-lockout helper and a `PasswordResetTokenStore`
 * that are never wired up, so brute-force attempts are unbounded and there is no
 * password-reset path. This module provides a minimal, dependency-free
 * implementation that the auth service can adopt incrementally.
 */
export interface LockoutPolicy {
  /** Failed attempts allowed within the window before locking. */
  maxAttempts: number;
  /** Rolling window in milliseconds. */
  windowMs: number;
}

export const DEFAULT_LOCKOUT_POLICY: LockoutPolicy = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
};

interface AttemptRecord {
  count: number;
  firstAt: number;
  lockedUntil: number | null;
}

/** In-memory failed-attempt tracker keyed by account identifier. */
export class AccountLockout {
  private readonly attempts = new Map<string, AttemptRecord>();

  constructor(private readonly policy: LockoutPolicy = DEFAULT_LOCKOUT_POLICY) {}

  /** Record a failed login; returns true if the account is now locked (#1933). */
  recordFailure(key: string, now: number = Date.now()): boolean {
    const record = this.attempts.get(key);
    if (!record || now - record.firstAt > this.policy.windowMs) {
      this.attempts.set(key, { count: 1, firstAt: now, lockedUntil: null });
      return false;
    }
    record.count += 1;
    if (record.count >= this.policy.maxAttempts) {
      record.lockedUntil = now + this.policy.windowMs;
      return true;
    }
    return false;
  }

  /** Whether the account is currently locked out. */
  isLocked(key: string, now: number = Date.now()): boolean {
    const record = this.attempts.get(key);
    return !!record && record.lockedUntil !== null && record.lockedUntil > now;
  }

  /** Clear attempt state after a successful login. */
  reset(key: string): void {
    this.attempts.delete(key);
  }
}

/** Issue a single-use password-reset token for an account (#1934). */
export function createPasswordResetToken(
  hash: (value: string) => string,
  random: () => string = () => Math.random().toString(36).slice(2),
): { token: string; tokenHash: string } {
  const token = random();
  return { token, tokenHash: hash(token) };
}
