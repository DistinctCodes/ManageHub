// Skeleton for the PaymentOrchestrator described in issue #1576
// (Payments 7/7 capstone): a single interface over rail adapters so
// checkout/booking code doesn't need to branch on which rail was chosen.
// This is a starting contract, not the full production implementation.
export type PaymentRail = 'fiat' | 'stellar-soroban';

export interface PaymentOrchestratorResult {
  paymentId: string;
  rail: PaymentRail;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
}

export interface PaymentRailAdapter {
  rail: PaymentRail;
  initiate(bookingId: string, amount: number): Promise<PaymentOrchestratorResult>;
  getStatus(paymentId: string): Promise<PaymentOrchestratorResult['status']>;
}

export class PaymentOrchestrator {
  private adapters = new Map<PaymentRail, PaymentRailAdapter>();

  registerAdapter(adapter: PaymentRailAdapter): void {
    this.adapters.set(adapter.rail, adapter);
  }

  async pay(
    rail: PaymentRail,
    bookingId: string,
    amount: number,
  ): Promise<PaymentOrchestratorResult> {
    const adapter = this.adapters.get(rail);
    if (!adapter) {
      throw new Error(`No payment adapter registered for rail "${rail}"`);
    }
    return adapter.initiate(bookingId, amount);
  }
}
