// Read-path sanity check for RevenueSplitConfig so a config that was
// mutated directly in the DB (bypassing write-time validation) is still
// caught before it's used to allocate a payout.
const TOTAL_BASIS_POINTS = 10000;

export interface RevenueSplitConfigLike {
  key: string;
  basisPoints: number;
}

export class InvalidRevenueSplitConfigError extends Error {}

export function assertRevenueSplitConfigValidOnRead(
  shares: readonly RevenueSplitConfigLike[],
): void {
  const total = shares.reduce((sum, s) => sum + s.basisPoints, 0);
  if (total !== TOTAL_BASIS_POINTS) {
    throw new InvalidRevenueSplitConfigError(
      `Revenue split basis points must sum to ${TOTAL_BASIS_POINTS}, got ${total}`,
    );
  }
}
