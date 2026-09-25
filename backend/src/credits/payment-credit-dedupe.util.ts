// Dedupe guard for payment-credits.service.ts so a retried
// payment-confirmation webhook can't grant credits twice for the same
// payment id.
export class PaymentCreditDedupeGuard {
  private granted = new Set<string>();

  wasAlreadyGranted(paymentId: string): boolean {
    return this.granted.has(paymentId);
  }

  markGranted(paymentId: string): void {
    this.granted.add(paymentId);
  }

  async grantOnce<T>(
    paymentId: string,
    grant: () => Promise<T>,
  ): Promise<T | null> {
    if (this.wasAlreadyGranted(paymentId)) return null;
    const result = await grant();
    this.markGranted(paymentId);
    return result;
  }
}
