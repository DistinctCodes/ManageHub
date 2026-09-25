// Tracks password reset tokens so a redeemed token cannot be replayed
// even if it leaks later (e.g. via a referrer header or log line).
export class PasswordResetTokenStore {
  private used = new Set<string>();

  isUsed(token: string): boolean {
    return this.used.has(token);
  }

  markUsed(token: string): void {
    this.used.add(token);
  }

  assertNotUsed(token: string): void {
    if (this.isUsed(token)) {
      throw new Error('Password reset token has already been used');
    }
  }

  redeem(token: string): void {
    this.assertNotUsed(token);
    this.markUsed(token);
  }
}
