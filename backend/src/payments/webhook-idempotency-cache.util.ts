// Replay protection for payment-webhook.controller.ts: enforces a
// timestamp tolerance window plus a short-lived idempotency-key cache
// so a captured, valid webhook payload can't be replayed.
export class WebhookIdempotencyCache {
  private seen = new Map<string, number>();

  constructor(
    private readonly ttlMs = 5 * 60 * 1000,
    private readonly maxClockSkewMs = 5 * 60 * 1000,
  ) {}

  isWithinTolerance(timestampMs: number): boolean {
    return Math.abs(Date.now() - timestampMs) <= this.maxClockSkewMs;
  }

  private prune(): void {
    const now = Date.now();
    for (const [key, expiresAt] of this.seen) {
      if (expiresAt <= now) this.seen.delete(key);
    }
  }

  isReplay(idempotencyKey: string): boolean {
    this.prune();
    return this.seen.has(idempotencyKey);
  }

  markSeen(idempotencyKey: string): void {
    this.seen.set(idempotencyKey, Date.now() + this.ttlMs);
  }
}
