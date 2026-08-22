import { UnprocessableEntityException } from '@nestjs/common';
import { PaymentStatus } from './enums/payment-status.enum';

/**
 * The single source of truth for legal Payment status transitions.
 * No code outside PaymentsService.transitionStatus() may assign
 * Payment#status directly (enforced in review, see issue #1570).
 */
const ALLOWED_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  [PaymentStatus.INITIATED]: [
    PaymentStatus.AWAITING_CONFIRMATION,
    PaymentStatus.FAILED,
    PaymentStatus.EXPIRED,
  ],
  [PaymentStatus.AWAITING_CONFIRMATION]: [
    PaymentStatus.CONFIRMED,
    PaymentStatus.FAILED,
    PaymentStatus.EXPIRED,
    // Escalation tier (issue #1572) — reconciliation couldn't resolve this
    // automatically after the long threshold.
    PaymentStatus.MANUAL_REVIEW,
  ],
  [PaymentStatus.CONFIRMED]: [
    PaymentStatus.REFUNDED,
    PaymentStatus.PARTIALLY_REFUNDED,
    PaymentStatus.DISPUTED,
  ],
  [PaymentStatus.FAILED]: [],
  [PaymentStatus.EXPIRED]: [],
  [PaymentStatus.REFUNDED]: [],
  // A later partial refund can complete into a full refund; the status
  // itself doesn't change on every additional partial (the refund ledger
  // tracks that), only when the refunded total reaches the captured amount.
  [PaymentStatus.PARTIALLY_REFUNDED]: [PaymentStatus.REFUNDED],
  // Admin recovery actions (issue #1572) — mark-resolved-manually or void.
  [PaymentStatus.MANUAL_REVIEW]: [
    PaymentStatus.CONFIRMED,
    PaymentStatus.FAILED,
    PaymentStatus.VOIDED,
  ],
  [PaymentStatus.DISPUTED]: [PaymentStatus.REFUNDED],
  [PaymentStatus.VOIDED]: [],
};

export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertValidTransition(
  from: PaymentStatus,
  to: PaymentStatus,
): void {
  if (!canTransition(from, to)) {
    throw new UnprocessableEntityException(
      `Illegal payment status transition: ${from} -> ${to}`,
    );
  }
}
