export enum SettlementBatchStatus {
  /** Entries claimed, payouts computed, nothing submitted yet. */
  PENDING = 'PENDING',
  /** At least one payout submitted, not all confirmed. */
  IN_PROGRESS = 'IN_PROGRESS',
  /** Every payout confirmed; every claimed entry marked settled. */
  SETTLED = 'SETTLED',
  /** Some payouts confirmed, at least one terminally failed. */
  PARTIALLY_SETTLED = 'PARTIALLY_SETTLED',
  /** No payout confirmed and at least one terminally failed. */
  FAILED = 'FAILED',
  /** Admin gave up on the failed payouts; their claims were released. */
  ABANDONED = 'ABANDONED',
}
