export enum PaymentStatus {
  INITIATED = 'INITIATED',
  AWAITING_CONFIRMATION = 'AWAITING_CONFIRMATION',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

/**
 * Statuses that still permit a competing initiate() for the same booking.
 * Used by the partial unique index and by the proactive conflict check.
 */
export const NON_TERMINAL_PAYMENT_STATUSES = [
  PaymentStatus.INITIATED,
  PaymentStatus.AWAITING_CONFIRMATION,
];
