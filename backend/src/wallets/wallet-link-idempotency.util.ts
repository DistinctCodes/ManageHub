// Idempotency-key handling for wallets.controller.ts's wallet-linking
// endpoint, so a retried request after a timeout short-circuits instead
// of creating a duplicate link attempt.
export class WalletLinkIdempotencyCache {
  private results = new Map<string, { result: unknown; expiresAt: number }>();

  constructor(private readonly ttlMs = 10 * 60 * 1000) {}

  get(idempotencyKey: string): unknown | undefined {
    const entry = this.results.get(idempotencyKey);
    if (!entry || entry.expiresAt <= Date.now()) return undefined;
    return entry.result;
  }

  set(idempotencyKey: string, result: unknown): void {
    this.results.set(idempotencyKey, {
      result,
      expiresAt: Date.now() + this.ttlMs,
    });
  }
}
