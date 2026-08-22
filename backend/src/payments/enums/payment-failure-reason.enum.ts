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

  // ── Soroban escrow rail (issue #1574) ─────────────────────────────────

  /** Transaction simulation failed against current contract/ledger state (e.g. a require_auth or balance check would revert). */
  SIMULATION_FAILED = 'SIMULATION_FAILED',
  /** The network rejected the transaction for an underpriced fee. */
  INSUFFICIENT_FEE = 'INSUFFICIENT_FEE',
  /** Two transactions raced for the same signing account's sequence number. */
  SEQUENCE_CONFLICT = 'SEQUENCE_CONFLICT',
  /** The transaction's time-bounds elapsed before it was included in a ledger. */
  TRANSACTION_EXPIRED = 'TRANSACTION_EXPIRED',
  /** The contract call itself reverted on-chain (e.g. insufficient custodial balance). */
  CONTRACT_REVERTED = 'CONTRACT_REVERTED',
}
