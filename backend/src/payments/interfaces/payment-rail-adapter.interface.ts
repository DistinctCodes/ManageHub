import { Payment } from '../entities/payment.entity';

export interface PaymentInitiationResult {
  providerReference: string;
  /** Opaque data the caller can hand back to the client (e.g. a checkout URL). */
  metadata?: Record<string, unknown>;
}

export type PaymentVerificationOutcome = 'confirmed' | 'failed' | 'pending';

export interface PaymentVerificationResult {
  outcome: PaymentVerificationOutcome;
}

export interface WebhookSignatureInput {
  rawBody: Buffer;
  signatureHeader: string | undefined;
}

export interface WebhookPayload {
  providerReference: string;
  outcome: PaymentVerificationOutcome;
}

/**
 * Provider-agnostic boundary between the Payment domain and a concrete rail
 * (Paystack, Stellar custodial, Stellar external, ...). Later issues in the
 * payment track implement real adapters; issue #1570 only needed `initiate`.
 * Issue #1571 adds the confirmation-side shape: verifying a webhook's
 * transport-level authenticity, parsing its payload, and a bounded
 * synchronous verify-by-reference call for the checkout-return fast path.
 */
export interface PaymentRailAdapter {
  initiate(payment: Payment): Promise<PaymentInitiationResult>;

  /** Transport-level authenticity check — must happen before any payload is trusted. */
  verifyWebhookSignature(input: WebhookSignatureInput): boolean;

  /** Only call after verifyWebhookSignature has passed. */
  parseWebhookPayload(rawBody: Buffer): WebhookPayload;

  /**
   * Synchronous, bounded call to the provider's verify-by-reference API for
   * the checkout-return fast path. Implementations should not do their own
   * unbounded waiting — the caller enforces the timeout.
   */
  verifyByReference(
    providerReference: string,
  ): Promise<PaymentVerificationResult>;
}
