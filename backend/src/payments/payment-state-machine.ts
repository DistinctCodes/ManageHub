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
  ],
  [PaymentStatus.CONFIRMED]: [
    PaymentStatus.REFUNDED,
    PaymentStatus.PARTIALLY_REFUNDED,
  ],
  [PaymentStatus.FAILED]: [],
  [PaymentStatus.EXPIRED]: [],
  [PaymentStatus.REFUNDED]: [],
  [PaymentStatus.PARTIALLY_REFUNDED]: [],
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
