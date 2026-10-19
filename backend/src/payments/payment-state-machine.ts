import { UnprocessableEntityException } from '@nestjs/common';
import { currentRequestId } from '../common/request-context';
import { PaymentStatus } from './enums/payment-status.enum';

/**
 * Where a rejected state transition originated. Used only for the incident
 * record (issue #1941) — see `assertValidTransition`.
 */
export type PaymentTransitionSource =
  | 'webhook'
  | 'reconciliation'
  | 'admin'
  | 'refund'
  | 'verify_return'
  | 'api';

/**
 * Minimal structural types so this pure module never needs to import the
 * concrete Nest Logger/MetricsService (keeps the state machine unit-testable
 * and free of framework wiring). Both are optional: callers that have no
 * logger/metrics simply get the throw with no incident record.
 */
interface RejectedTransitionLogger {
  warn(message: string, context?: Record<string, unknown>): void;
}

interface RejectedTransitionMetrics {
  recordRejectedPaymentTransition(
    from: string,
    to: string,
    source: string,
  ): void;
}

export interface RejectedTransitionContext {
  paymentId?: string;
  source?: PaymentTransitionSource;
  logger?: RejectedTransitionLogger;
  metrics?: RejectedTransitionMetrics;
}

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
  // Merchant-favor dispute resolution is an explicit admin action; only
  // the payments admin surface is allowed to take this path.
  [PaymentStatus.DISPUTED]: [PaymentStatus.REFUNDED, PaymentStatus.CONFIRMED],
  [PaymentStatus.VOIDED]: [],
};

export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Throws when `from -> to` is illegal, recording one structured warning and
 * incrementing a metric first (issue #1941) so a refused transition (e.g. a
 * webhook retry hitting a terminal payment) leaves an incident trail with the
 * payment id, both states, the origin of the attempt, and the active request
 * id. The record is emitted only when a logger/metrics sink is supplied — the
 * transition guard itself stays a pure, dependency-free check.
 */
export function assertValidTransition(
  from: PaymentStatus,
  to: PaymentStatus,
  context: RejectedTransitionContext = {},
): void {
  if (canTransition(from, to)) {
    return;
  }
  const requestId = currentRequestId();
  const { paymentId, source, logger, metrics } = context;
  metrics?.recordRejectedPaymentTransition(from, to, source ?? 'api');
  logger?.warn(`Rejected illegal payment state transition: ${from} -> ${to}`, {
    paymentId,
    from,
    to,
    source: source ?? 'api',
    requestId,
  });
  throw new UnprocessableEntityException(
    `Illegal payment status transition: ${from} -> ${to}`,
  );
}
