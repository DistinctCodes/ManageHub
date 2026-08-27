import {
  PaymentVerificationOutcome,
  WebhookPayload,
} from './interfaces/payment-rail-adapter.interface';

/**
 * Normalized, versioned webhook payload contract (BE-137). Every payment
 * rail adapter maps its provider-specific payload into this shape before the
 * confirmation service consumes it. The contract is documented in
 * ../payments/README.md ("Webhook payload contract"); this module is the
 * machine-checkable source of truth it points at.
 */
export const PAYMENT_WEBHOOK_CONTRACT_VERSION = '1.0';

const VALID_OUTCOMES: ReadonlySet<string> = new Set([
  'confirmed',
  'failed',
  'pending',
]);

/**
 * Validates an already-parsed payload against the normalized contract,
 * throwing a clear, actionable error on the first violation so a
 * wrong-shaped or malformed webhook is rejected loudly instead of being
 * silently mishandled downstream.
 */
export function validateWebhookPayload(value: unknown): WebhookPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(
      'Malformed webhook payload: expected a JSON object (contract v1.0)',
    );
  }

  const body = value as Record<string, unknown>;

  if (
    typeof body.providerReference !== 'string' ||
    body.providerReference.trim() === ''
  ) {
    throw new Error(
      'Malformed webhook payload: missing required string field ' +
        '"providerReference" (contract v1.0)',
    );
  }

  if (typeof body.outcome !== 'string' || !VALID_OUTCOMES.has(body.outcome)) {
    throw new Error(
      'Malformed webhook payload: "outcome" must be one of ' +
        '"confirmed", "failed", "pending" (contract v1.0)',
    );
  }

  return {
    providerReference: body.providerReference,
    outcome: body.outcome as PaymentVerificationOutcome,
  };
}
