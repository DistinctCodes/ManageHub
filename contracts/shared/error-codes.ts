/**
 * Shared contract `Error` enum codes (#1885, #2025).
 *
 * Generated/synchronized from `payment_escrow.abi.json`. Exposing them here lets
 * the backend client compare against named constants instead of magic numbers,
 * and guarantees a single canonical source of truth between the Rust contract
 * and TypeScript clients.
 */
export enum ContractError {
  NotFound = 1,
  AlreadyResolved = 2,
  InvalidAmount = 3,
  AlreadyExists = 4,
  ArithmeticOverflow = 5,
  AlreadyReleased = 6,
  AlreadyRefunded = 7,
  AlreadyInitialized = 10,
  NotInitialized = 11,
  Unauthorized = 12,
  Paused = 13,
  NoPendingAdmin = 14,
  AmountExceedsEscrow = 20,
  NothingToRefund = 21,
}

export const CONTRACT_ERROR_NAMES: Readonly<Record<number, string>> =
  Object.freeze({
    [ContractError.NotFound]: "NotFound",
    [ContractError.AlreadyResolved]: "AlreadyResolved",
    [ContractError.InvalidAmount]: "InvalidAmount",
    [ContractError.AlreadyExists]: "AlreadyExists",
    [ContractError.ArithmeticOverflow]: "ArithmeticOverflow",
    [ContractError.AlreadyReleased]: "AlreadyReleased",
    [ContractError.AlreadyRefunded]: "AlreadyRefunded",
    [ContractError.AlreadyInitialized]: "AlreadyInitialized",
    [ContractError.NotInitialized]: "NotInitialized",
    [ContractError.Unauthorized]: "Unauthorized",
    [ContractError.Paused]: "Paused",
    [ContractError.NoPendingAdmin]: "NoPendingAdmin",
    [ContractError.AmountExceedsEscrow]: "AmountExceedsEscrow",
    [ContractError.NothingToRefund]: "NothingToRefund",
  });

/** Human-readable name for a contract error code, if known. */
export function contractErrorName(code: number): string {
  return CONTRACT_ERROR_NAMES[code] ?? `Unknown(${code})`;
}
