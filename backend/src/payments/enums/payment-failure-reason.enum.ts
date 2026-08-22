/**
 * Failure taxonomy (issue #1572) as first-class data rather than free text
 * — stored on Payment#failureReason alongside a terminal status (FAILED or
 * EXPIRED). Distinct from PaymentStatus: the status is WHAT happened to the
 * payment lifecycle, this is WHY.
 */
export enum PaymentFailureReason {
  /** Provider explicitly rejected the charge (card declined, insufficient funds, etc). */
  DECLINED = 'DECLINED',
  /** No confirmation arrived (webhook or reconciliation) within the payment's TTL. */
  EXPIRED = 'EXPIRED',
  /** Talking to the provider itself failed (5xx / timeout) — not a provider verdict. */
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  /** The payment never progressed past INITIATED before expiring — the user never returned. */
  ABANDONED = 'ABANDONED',
}
