/**
 * What the credits module does with a #1570/#1574 Payment once it
 * CONFIRMS. Mutually exclusive: money that funds a member's credit
 * balance is a liability to that member, never platform revenue to split.
 */
export enum PaymentCreditApplicationKind {
  /** Credit the payer's ledger balance with the payment amount. */
  TOP_UP = 'TOP_UP',
  /** Distribute the payment amount across a RevenueSplitConfig. */
  REVENUE_SPLIT = 'REVENUE_SPLIT',
}
