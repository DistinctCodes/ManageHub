/** Why a balanced set of ledger entries was posted (issue #1575). */
export enum LedgerTransactionKind {
  /** A completed #1570/#1574 payment funding a user's credit balance. */
  TOP_UP = 'TOP_UP',
  /** A high-frequency, low-value charge against a user's credit balance. */
  CHARGE = 'CHARGE',
  /** A RevenueSplitConfig computed over a payment or a settlement batch. */
  REVENUE_SPLIT = 'REVENUE_SPLIT',
  /** Clears a payable account once its off-platform payout is confirmed. */
  SETTLEMENT = 'SETTLEMENT',
  /** Compensating entries that undo an earlier transaction. */
  REVERSAL = 'REVERSAL',
  /** Manual admin correction — always carries a reason. */
  ADJUSTMENT = 'ADJUSTMENT',
}
