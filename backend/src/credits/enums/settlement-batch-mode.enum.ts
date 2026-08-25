/**
 * How a settlement batch decides who gets paid (issue #1575).
 *
 * The two modes exist because there are two genuinely different questions
 * a settlement run answers, and a single pass runs both in sequence:
 * "how should accumulated revenue be apportioned?" and "which accounts
 * already have a balance owed to them off-platform?".
 */
export enum SettlementBatchMode {
  /**
   * Splits a revenue account's accumulated (unclaimed) balance across a
   * RevenueSplitConfig: internal shares become ledger entries, external
   * shares become on-chain payouts.
   */
  DISTRIBUTION = 'DISTRIBUTION',
  /**
   * Nets each payable account's own unclaimed movements and pays that
   * account's own external address — one on-chain transfer per account
   * instead of one per micro-event.
   */
  NET_PAYABLE = 'NET_PAYABLE',
}
