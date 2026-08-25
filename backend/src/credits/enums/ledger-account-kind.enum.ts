/**
 * Every account in the double-entry ledger (issue #1575) is one of these
 * kinds. `balance` always means SUM(CREDIT) - SUM(DEBIT) for the account,
 * and every ledger transaction has equal debits and credits — so the sum
 * of every account's balance in a currency is always exactly zero. That
 * invariant is what makes TREASURY meaningful: it is the contra/clearing
 * account standing in for the outside world (fiat rails, on-chain
 * transfers), so its balance is the negation of what the platform owes.
 */
export enum LedgerAccountKind {
  /** One per user: their spendable credit balance. */
  USER = 'USER',
  /**
   * Clearing account for value crossing the platform boundary — debited
   * when a top-up brings money in, credited when a settlement pays money
   * out. Never has a payout address; it *is* the outside world.
   */
  TREASURY = 'TREASURY',
  /** Where micro-charges accumulate before revenue distribution. */
  REVENUE = 'REVENUE',
  /** The platform's own fee take, after distribution. */
  PLATFORM_FEE = 'PLATFORM_FEE',
  /** A hub operator's payable balance — settled off-platform. */
  HUB_OPERATOR = 'HUB_OPERATOR',
  /** A referrer's reward payable balance — settled off-platform. */
  REFERRAL = 'REFERRAL',
}

/** Kinds that belong to a specific owner (user id, hub id, referrer id). */
export const OWNED_LEDGER_ACCOUNT_KINDS: readonly LedgerAccountKind[] = [
  LedgerAccountKind.USER,
  LedgerAccountKind.HUB_OPERATOR,
  LedgerAccountKind.REFERRAL,
];

/**
 * Kinds whose accumulated balance is what settlement distributes. A
 * distribution batch reads these accounts, never a USER account — a
 * member's credit balance is a liability to them, not platform revenue.
 */
export const DISTRIBUTABLE_LEDGER_ACCOUNT_KINDS: readonly LedgerAccountKind[] =
  [LedgerAccountKind.REVENUE];
