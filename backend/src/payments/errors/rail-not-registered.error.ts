// Typed error for payment-rail-registry.ts lookups, so callers
// (payments.service.ts, payments-admin.controller.ts) get a catchable
// error instead of an implicit undefined for an unregistered rail.
export class RailNotRegisteredError extends Error {
  constructor(public readonly railKey: string) {
    super(`No payment rail registered for key "${railKey}"`);
    this.name = 'RailNotRegisteredError';
  }
}

export function assertRailRegistered<T>(
  rail: T | undefined,
  railKey: string,
): T {
  if (rail === undefined) {
    throw new RailNotRegisteredError(railKey);
  }
  return rail;
}
