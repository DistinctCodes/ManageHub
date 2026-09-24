// Explicit guard for refunds.service.ts: rejects a partial refund whose
// amount exceeds what's still refundable, rather than relying on the
// ledger to fail downstream.
export class RefundExceedsRemainingBalanceError extends Error {
  constructor(requested: number, remaining: number) {
    super(
      `Refund of ${requested} exceeds remaining refundable balance of ${remaining}`,
    );
  }
}

export function assertRefundWithinRemainingBalance(
  requestedAmount: number,
  remainingRefundableAmount: number,
): void {
  if (requestedAmount > remainingRefundableAmount) {
    throw new RefundExceedsRemainingBalanceError(
      requestedAmount,
      remainingRefundableAmount,
    );
  }
}
