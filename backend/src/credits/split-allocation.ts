/**
 * Basis-point allocation with an explicit, documented remainder rule
 * (issue #1575).
 *
 * ## The rounding policy
 *
 * Any percentage split of an integer amount leaves a remainder: 1000
 * minor units across 3333/3333/3334 basis points floors to 333/333/333
 * and loses 1. Silently dropping it makes the ledger stop balancing;
 * rounding each share independently can *create* value. So:
 *
 *  1. Every recipient first gets `floor(amount * basisPoints / 10000)`.
 *  2. The leftover (always strictly less than the recipient count) is
 *     handed out one minor unit at a time to the recipients with the
 *     largest fractional remainder — the **largest-remainder method**.
 *  3. Ties are broken deterministically: lower `sortOrder` first, then
 *     the recipient's position in the input. Identical inputs therefore
 *     always produce an identical allocation — there is no run-to-run
 *     drift for an auditor to chase.
 *
 * The result is guaranteed to sum to exactly `amount`, which is what lets
 * a split be posted as balanced double-entry ledger legs.
 */

export interface BasisPointShare {
  /** Caller's identifier — echoed back on the allocation. */
  key: string;
  basisPoints: number;
  /** Deterministic tie-breaker for the remainder; lower wins. */
  sortOrder?: number;
}

export interface AllocatedShare<T extends BasisPointShare = BasisPointShare> {
  share: T;
  /** Minor units. Sum over all allocations === the input amount. */
  amount: number;
  /** How many minor units this share received from the remainder pass. */
  remainderUnits: number;
}

export const TOTAL_BASIS_POINTS = 10000;

/** Thrown for a config that could never allocate correctly. */
export class SplitAllocationError extends Error {}

/**
 * Validates that a set of shares is a usable split: at least one
 * recipient, each with positive basis points, summing to exactly 100%.
 * Called at configuration time so a broken split is rejected there, and
 * again at computation time as a defence against a config mutated by
 * anything that bypassed the service.
 */
export function assertBasisPointsSumToTotal(
  shares: readonly BasisPointShare[],
): void {
  if (shares.length === 0) {
    throw new SplitAllocationError(
      'A revenue split needs at least one recipient',
    );
  }
  for (const share of shares) {
    if (!Number.isInteger(share.basisPoints) || share.basisPoints <= 0) {
      throw new SplitAllocationError(
        `Recipient "${share.key}" has basis points ${share.basisPoints}; ` +
          'each recipient needs a positive integer share',
      );
    }
  }
  const total = shares.reduce((sum, share) => sum + share.basisPoints, 0);
  if (total !== TOTAL_BASIS_POINTS) {
    throw new SplitAllocationError(
      `Revenue split basis points must sum to ${TOTAL_BASIS_POINTS} ` +
        `(100%), got ${total}`,
    );
  }
}

/**
 * Allocates `amount` (minor units, >= 0) across `shares`. See the module
 * doc for the rounding rule. The returned array is in input order, not
 * allocation order, so callers can zip it against their own recipients.
 */
export function allocateByBasisPoints<T extends BasisPointShare>(
  amount: number,
  shares: readonly T[],
): AllocatedShare<T>[] {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new SplitAllocationError(
      `Split amount must be a non-negative integer (minor units), got ${amount}`,
    );
  }
  // Keeps `amount * basisPoints` exact in IEEE-754 integer arithmetic.
  if (amount > Number.MAX_SAFE_INTEGER / TOTAL_BASIS_POINTS) {
    throw new SplitAllocationError(
      `Split amount ${amount} is too large to apportion exactly`,
    );
  }
  assertBasisPointsSumToTotal(shares);

  const allocations = shares.map((share, index) => {
    const scaled = amount * share.basisPoints;
    return {
      share,
      index,
      amount: Math.floor(scaled / TOTAL_BASIS_POINTS),
      remainder: scaled % TOTAL_BASIS_POINTS,
      remainderUnits: 0,
    };
  });

  let leftover =
    amount - allocations.reduce((sum, entry) => sum + entry.amount, 0);

  // Strictly less than allocations.length, so a single ordered pass is
  // always enough — no wrap-around, no recipient getting two units while
  // another with the same remainder gets none.
  const byRemainder = [...allocations].sort(
    (a, b) =>
      b.remainder - a.remainder ||
      (a.share.sortOrder ?? 0) - (b.share.sortOrder ?? 0) ||
      a.index - b.index,
  );
  for (const entry of byRemainder) {
    if (leftover <= 0) {
      break;
    }
    entry.amount += 1;
    entry.remainderUnits += 1;
    leftover -= 1;
  }

  return allocations.map((entry) => ({
    share: entry.share,
    amount: entry.amount,
    remainderUnits: entry.remainderUnits,
  }));
}
