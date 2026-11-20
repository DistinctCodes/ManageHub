/** #2089: execution status for refund records. */
export enum RefundExecutionStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
}

/** #2088: build negative ledger legs that reverse the credits/splits a payment created. */
export function buildReversalLegs<T extends { amount: number }>(legs: T[], ratio = 1): T[] {
  return legs.map((leg) => ({ ...leg, amount: -Math.round(leg.amount * ratio) }));
}
