/**
 * The port settlement uses to move a payable balance off-platform (issue
 * #1575) — implemented over the #1574 Soroban escrow rail, but stated as
 * a port so the ledger never depends on a specific chain, and so
 * settlement can be tested without one.
 *
 * Two rules the ledger relies on, and any implementation must honour:
 *
 *  1. `submitPayout` is idempotent on `idempotencyKey`. Re-submitting the
 *     same key must never move value twice — that is what makes a batch
 *     that crashed mid-run safe to re-execute.
 *  2. `submitPayout` returning does NOT mean the payout happened. Only
 *     `getPayoutStatus` returning 'confirmed', read from fresh rail
 *     state, does. Settlement never marks a ledger entry settled on the
 *     strength of a submission.
 */
export interface PayoutSubmission {
  /** Opaque handle to look the payout up again later. */
  reference: string;
}

export interface SubmitPayoutInput {
  destinationAddress: string;
  /** Minor units. */
  amount: number;
  currency: string;
  /** Stable natural key for this payout; the dedupe key on the rail. */
  idempotencyKey: string;
}

export type PayoutStatus = 'confirmed' | 'failed' | 'pending';

export interface ExternalPayoutRail {
  submitPayout(input: SubmitPayoutInput): Promise<PayoutSubmission>;

  /** Fresh read of rail state — never derived from a submission response. */
  getPayoutStatus(reference: string): Promise<PayoutStatus>;
}
