// Logs rejected transitions from payment-state-machine.ts at warn level
// with both states and the payment id, so incidents like a webhook retry
// trying to re-release an already-released payment are reconstructable.
export interface RejectedTransitionLogger {
  warn(message: string, context: Record<string, unknown>): void;
}

export function logRejectedTransition(
  logger: RejectedTransitionLogger,
  paymentId: string,
  fromState: string,
  toState: string,
): void {
  logger.warn('Rejected illegal payment state transition', {
    paymentId,
    fromState,
    toState,
  });
}
