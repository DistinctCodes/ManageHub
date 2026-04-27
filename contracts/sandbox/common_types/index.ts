// CT-40: Shared common types for sandbox contracts (TypeScript mirror of common_types crate)

export interface TimestampRange {
  start: bigint;
  end: bigint;
}

export function isValidRange(range: TimestampRange): boolean {
  return range.start < range.end;
}

/**
 * Converts basis points to an amount.
 * @param total - The total amount
 * @param bps   - Basis points (1 bps = 0.01%)
 */
export function bpsToAmount(total: bigint, bps: number): bigint {
  return (total * BigInt(bps)) / 10_000n;
}

export interface ContractError {
  code: number;
  message: string;
}

export function makeError(code: number, message: string): ContractError {
  return { code, message };
}

export const CommonErrors = {
  Unauthorized: makeError(1, 'Unauthorized'),
  NotFound: makeError(2, 'Not found'),
  AlreadyExists: makeError(3, 'Already exists'),
  InvalidInput: makeError(4, 'Invalid input'),
} as const;
