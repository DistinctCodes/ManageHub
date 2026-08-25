/**
 * One payout leg of a settlement batch. The gap between SUBMITTED and
 * CONFIRMED is the whole point (issue #1575): a submitted on-chain
 * transfer is NOT a settled one, so the claimed ledger entries stay
 * unsettled until the rail confirms from fresh chain state.
 */
export enum SettlementPayoutStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}
