/**
 * Strict integer arithmetic for payment amounts expressed in minor units.
 *
 * Currency must never pass through a fractional representation. JavaScript
 * numbers can represent safe integers exactly, but neither a decimal amount
 * nor a multiplication whose product exceeds `Number.MAX_SAFE_INTEGER` is a
 * safe currency value. These helpers reject those cases before arithmetic
 * begins and use only integer operations for allocation.
 */
export const TOTAL_BASIS_POINTS = 10_000;

/** Typed failure for invalid currency integers or an unsafe scaling operation. */
export class MinorUnitsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MinorUnitsError';
  }
}

/**
 * Validates one non-negative, safe integer used as a currency or ratio value.
 *
 * `Number.isSafeInteger` deliberately rejects `NaN`, infinities, fractions,
 * and values beyond the exactly representable integer range. The explicit
 * `typeof` check also makes the boundary safe for JSON or database values
 * that reached this helper without TypeScript's compile-time guarantee.
 * The input is returned so callers can use validation and normalization in a
 * single expression.
 */
export function assertMinorUnits(value: number, label = 'value'): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new MinorUnitsError(
      `${label} must be a non-negative safe integer, got ${String(value)}`,
    );
  }
  return value;
}

/**
 * Multiplies a minor-unit amount by an integer basis-point ratio and floors
 * the result to a whole minor unit.
 *
 * `totalBasisPoints` is explicit so this primitive can be used for both the
 * conventional 10,000 basis points in 100% and a caller's other integer
 * denominator. The scaled product is guarded before division; accepting an
 * unsafe product would make the quotient and remainder unreliable. A zero
 * ratio is valid, but a zero denominator and a share larger than its
 * denominator are rejected as malformed currency policy.
 */
export function multiplyMinorUnits(
  amount: number,
  basisPoints: number,
  totalBasisPoints: number,
): number {
  assertMinorUnits(amount, 'amount');
  assertMinorUnits(basisPoints, 'basisPoints');
  assertMinorUnits(totalBasisPoints, 'totalBasisPoints');

  if (totalBasisPoints === 0) {
    throw new MinorUnitsError('totalBasisPoints must be greater than zero');
  }
  if (basisPoints > totalBasisPoints) {
    throw new MinorUnitsError(
      `basisPoints (${basisPoints}) cannot exceed totalBasisPoints (${totalBasisPoints})`,
    );
  }
  if (basisPoints === 0) {
    return 0;
  }

  const scaled = amount * basisPoints;
  if (!Number.isSafeInteger(scaled)) {
    throw new MinorUnitsError(
      `amount ${amount} cannot be scaled exactly by ${basisPoints}/${totalBasisPoints}`,
    );
  }

  return Math.floor(scaled / totalBasisPoints);
}

interface AllocationEntry {
  index: number;
  amount: number;
  remainder: number;
}

/**
 * Splits an amount across non-negative basis-point shares whose sum is
 * exactly 10,000 (100%). The result is in input order.
 *
 * Every share first receives `floor(amount * share / 10000)`. Any leftover
 * minor units are then assigned by the largest-remainder rule, with input
 * position as the deterministic tie-breaker. This is the same conservation
 * property required for a balanced ledger: the returned integers always sum
 * exactly to `amount`, including when the amount is one unit or a recipient
 * would otherwise round to zero. The amount is rejected when the scaled
 * integer domain could exceed `Number.MAX_SAFE_INTEGER`, rather than
 * approximating a value that cannot be represented exactly.
 */
export function apportionByBasisPoints(
  amount: number,
  basisPoints: readonly number[],
): number[] {
  assertMinorUnits(amount, 'amount');
  if (!Array.isArray(basisPoints) || basisPoints.length === 0) {
    throw new MinorUnitsError('basisPoints must contain at least one share');
  }

  let totalBasisPoints = 0;
  for (const [index, share] of basisPoints.entries()) {
    assertMinorUnits(share, `basisPoints[${index}]`);
    const nextTotal = totalBasisPoints + share;
    if (!Number.isSafeInteger(nextTotal)) {
      throw new MinorUnitsError(
        'basisPoints total exceeds the safe integer range',
      );
    }
    totalBasisPoints = nextTotal;
  }
  if (totalBasisPoints !== TOTAL_BASIS_POINTS) {
    throw new MinorUnitsError(
      `basisPoints must sum to ${TOTAL_BASIS_POINTS}, got ${totalBasisPoints}`,
    );
  }
  const maximumScalableAmount = Math.floor(
    Number.MAX_SAFE_INTEGER / TOTAL_BASIS_POINTS,
  );
  if (amount > maximumScalableAmount) {
    throw new MinorUnitsError(
      `amount ${amount} is too large to scale exactly by ${TOTAL_BASIS_POINTS}`,
    );
  }

  const entries: AllocationEntry[] = basisPoints.map((share, index) => {
    const scaled = amount * share;
    if (!Number.isSafeInteger(scaled)) {
      throw new MinorUnitsError(
        `amount ${amount} cannot be scaled exactly for basisPoints[${index}]`,
      );
    }
    return {
      index,
      amount: Math.floor(scaled / TOTAL_BASIS_POINTS),
      remainder: scaled % TOTAL_BASIS_POINTS,
    };
  });

  let leftover =
    amount -
    entries.reduce((sum, entry) => sum + entry.amount, 0);
  const byRemainder = [...entries].sort(
    (left, right) =>
      right.remainder - left.remainder || left.index - right.index,
  );

  for (const entry of byRemainder) {
    if (leftover <= 0) {
      break;
    }
    entry.amount += 1;
    leftover -= 1;
  }

  if (leftover !== 0) {
    throw new MinorUnitsError(
      `Unable to apportion ${amount} minor units exactly`,
    );
  }

  const result = new Array<number>(entries.length);
  for (const entry of entries) {
    result[entry.index] = entry.amount;
  }
  return result;
}
