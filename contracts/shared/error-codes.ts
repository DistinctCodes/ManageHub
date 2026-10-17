/**
 * Shared contract `Error` enum codes (#1885).
 *
 * The Soroban contracts return numeric error codes. Exposing them here lets the
 * backend client compare against named constants instead of magic numbers, and
 * gives a single place to update when the contract error enum changes.
 */
export enum ContractError {
  AlreadyExists = 1,
  NotFound = 2,
  InvalidAmount = 3,
  Unauthorized = 4,
  InvalidState = 5,
}

export const CONTRACT_ERROR_NAMES: Readonly<Record<number, string>> =
  Object.freeze({
    [ContractError.AlreadyExists]: "AlreadyExists",
    [ContractError.NotFound]: "NotFound",
    [ContractError.InvalidAmount]: "InvalidAmount",
    [ContractError.Unauthorized]: "Unauthorized",
    [ContractError.InvalidState]: "InvalidState",
  });

/** Human-readable name for a contract error code, if known. */
export function contractErrorName(code: number): string {
  return CONTRACT_ERROR_NAMES[code] ?? `Unknown(${code})`;
}
