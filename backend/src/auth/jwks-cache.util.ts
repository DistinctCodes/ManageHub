// Simple TTL cache for JWKS keys so verification survives key rotation
// without hammering the JWKS endpoint on every request.
export interface CachedJwks {
  keys: unknown[];
  fetchedAt: number;
}

export class JwksCache {
  private cache: CachedJwks | null = null;

  constructor(private readonly ttlMs = 10 * 60 * 1000) {}

  isStale(): boolean {
    if (!this.cache) return true;
    return Date.now() - this.cache.fetchedAt > this.ttlMs;
  }

  get(): unknown[] | null {
    return this.isStale() ? null : (this.cache?.keys ?? null);
  }

  set(keys: unknown[]): void {
    this.cache = { keys, fetchedAt: Date.now() };
  }

  async getOrRefresh(fetchKeys: () => Promise<unknown[]>): Promise<unknown[]> {
    const cached = this.get();
    if (cached) return cached;
    const keys = await fetchKeys();
    this.set(keys);
    return keys;
  }
}
