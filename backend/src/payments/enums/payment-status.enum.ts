export enum PaymentStatus {
  INITIATED = 'INITIATED',
  AWAITING_CONFIRMATION = 'AWAITING_CONFIRMATION',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  // Escalation tier (issue #1572): a payment reconciliation could not
  // resolve automatically after the long threshold — never silently
  // retried forever, surfaced to admins with a reason instead.
  MANUAL_REVIEW = 'MANUAL_REVIEW',
  // Chargeback / dispute flagged against an already-CONFIRMED payment.
  DISPUTED = 'DISPUTED',
  // Admin recovery action: a MANUAL_REVIEW payment deliberately closed out
  // without resolving to CONFIRMED or FAILED (e.g. abandoned booking).
  VOIDED = 'VOIDED',
}

/**
 * Statuses that still permit a competing initiate() for the same booking.
 * Used by the partial unique index and by the proactive conflict check.
 */
export const NON_TERMINAL_PAYMENT_STATUSES = [
  PaymentStatus.INITIATED,
  PaymentStatus.AWAITING_CONFIRMATION,
];
