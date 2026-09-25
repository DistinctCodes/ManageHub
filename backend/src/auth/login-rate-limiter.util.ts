// Minimal in-memory rate limiter keyed by account + IP, for the login
// endpoint. Meant to sit in front of auth.controller.ts's login handler.
interface Attempt {
  count: number;
  firstAttemptAt: number;
}

export class LoginRateLimiter {
  private attempts = new Map<string, Attempt>();

  constructor(
    private readonly maxAttempts = 5,
    private readonly windowMs = 15 * 60 * 1000,
  ) {}

  private key(account: string, ip: string): string {
    return `${account}:${ip}`;
  }

  isAllowed(account: string, ip: string): boolean {
    const key = this.key(account, ip);
    const entry = this.attempts.get(key);
    if (!entry) return true;
    if (Date.now() - entry.firstAttemptAt > this.windowMs) {
      this.attempts.delete(key);
      return true;
    }
    return entry.count < this.maxAttempts;
  }

  recordFailure(account: string, ip: string): void {
    const key = this.key(account, ip);
    const entry = this.attempts.get(key);
    if (!entry || Date.now() - entry.firstAttemptAt > this.windowMs) {
      this.attempts.set(key, { count: 1, firstAttemptAt: Date.now() });
    } else {
      entry.count += 1;
    }
  }
}
