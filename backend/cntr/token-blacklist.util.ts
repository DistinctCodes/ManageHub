export class TokenBlacklist {
  private readonly store = new Map<string, Date>();

  blacklist(jti: string, expiresAt: Date): void {
    this.store.set(jti, expiresAt);
  }

  isBlacklisted(jti: string): boolean {
    const expiresAt = this.store.get(jti);
    if (!expiresAt) return false;
    return expiresAt > new Date();
  }

  purgeExpired(now: Date = new Date()): void {
    for (const [jti, expiresAt] of this.store) {
      if (expiresAt < now) {
        this.store.delete(jti);
      }
    }
  }
}
