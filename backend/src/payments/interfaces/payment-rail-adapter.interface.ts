import { Payment } from '../entities/payment.entity';

export interface PaymentInitiationResult {
  providerReference: string;
  /** Opaque data the caller can hand back to the client (e.g. a checkout URL). */
  metadata?: Record<string, unknown>;
}

/**
 * Provider-agnostic boundary between the Payment domain and a concrete rail
 * (Paystack, Stellar custodial, Stellar external, ...). Later issues in the
 * payment track implement real adapters; this issue only needs the shape.
 */
export interface PaymentRailAdapter {
  initiate(payment: Payment): Promise<PaymentInitiationResult>;
}
