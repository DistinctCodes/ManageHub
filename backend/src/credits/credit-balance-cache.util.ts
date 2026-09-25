// Short-TTL cache for credits.service.ts balance reads, invalidated on
// write, so the high-frequency usage-metering path doesn't hit the DB
// on every call.
export class CreditBalanceCache {
  private cache = new Map<string, { balance: number; expiresAt: number }>();

  constructor(private readonly ttlMs = 2000) {}

  get(userId: string): number | null {
    const entry = this.cache.get(userId);
    if (!entry || entry.expiresAt <= Date.now()) return null;
    return entry.balance;
  }

  set(userId: string, balance: number): void {
    this.cache.set(userId, { balance, expiresAt: Date.now() + this.ttlMs });
  }

  invalidate(userId: string): void {
    this.cache.delete(userId);
  }
}
