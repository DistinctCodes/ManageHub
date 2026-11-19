import { createHash, randomBytes } from 'crypto';

/** #2078: per-account login lockout after repeated failures. */
export class LoginLockout {
  private failures = new Map<string, { count: number; until?: number }>();
  constructor(private maxAttempts = 5, private lockMs = 15 * 60_000) {}

  isLocked(email: string): boolean {
    const f = this.failures.get(email);
    return !!f?.until && f.until > Date.now();
  }
  recordFailure(email: string): void {
    const f = this.failures.get(email) ?? { count: 0 };
    f.count += 1;
    if (f.count >= this.maxAttempts) { f.until = Date.now() + this.lockMs; f.count = 0; }
    this.failures.set(email, f);
  }
  reset(email: string): void { this.failures.delete(email); }
}

/** #2079: password-reset token; store only the hash, email the raw token. */
export function createPasswordResetToken() {
  const token = randomBytes(32).toString('hex');
  return { token, tokenHash: createHash('sha256').update(token).digest('hex') };
}
