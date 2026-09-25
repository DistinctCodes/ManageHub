import {
  apportionByBasisPoints,
  assertMinorUnits,
  MinorUnitsError,
  multiplyMinorUnits,
  TOTAL_BASIS_POINTS,
} from './minor-units';

const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
}

describe('assertMinorUnits', () => {
  it('accepts zero and safe non-negative integers', () => {
    expect(assertMinorUnits(0, 'amount')).toBe(0);
    expect(assertMinorUnits(Number.MAX_SAFE_INTEGER, 'amount')).toBe(
      Number.MAX_SAFE_INTEGER,
    );
  });

  it('rejects fractional, negative, non-finite, and unsafe values', () => {
    const invalidValues: Array<[string, number]> = [
      ['a fractional value', 1.5],
      ['a negative value', -1],
      ['NaN', Number.NaN],
      ['infinity', Number.POSITIVE_INFINITY],
      ['an unsafe integer', Number.MAX_SAFE_INTEGER + 1],
    ];

    for (const [, value] of invalidValues) {
      expect(() => assertMinorUnits(value, 'amount')).toThrow(MinorUnitsError);
      expect(() => assertMinorUnits(value, 'amount')).toThrow(
        /amount must be a non-negative safe integer/,
      );
    }
  });
});

describe('multiplyMinorUnits', () => {
  it('multiplies by an integer basis-point ratio and floors the result', () => {
    expect(multiplyMinorUnits(1001, 2500, TOTAL_BASIS_POINTS)).toBe(250);
    expect(multiplyMinorUnits(1, 1, TOTAL_BASIS_POINTS)).toBe(0);
    expect(multiplyMinorUnits(1, TOTAL_BASIS_POINTS, TOTAL_BASIS_POINTS)).toBe(
      1,
    );
  });

  it('rejects a scaling product outside the safe integer range', () => {
    expect(() =>
      multiplyMinorUnits(
        Number.MAX_SAFE_INTEGER,
        TOTAL_BASIS_POINTS - 1,
        TOTAL_BASIS_POINTS,
      ),
    ).toThrow(MinorUnitsError);
    expect(() =>
      multiplyMinorUnits(
        Number.MAX_SAFE_INTEGER,
        TOTAL_BASIS_POINTS,
        TOTAL_BASIS_POINTS,
      ),
    ).toThrow(MinorUnitsError);
  });

  it('rejects invalid ratio denominators and shares', () => {
    expect(() => multiplyMinorUnits(100, 1, 0)).toThrow(/greater than zero/);
    expect(() => multiplyMinorUnits(100, 10001, 10000)).toThrow(
      /cannot exceed/,
    );
    expect(() => multiplyMinorUnits(100.5, 1, 10000)).toThrow(
      MinorUnitsError,
    );
    expect(() => multiplyMinorUnits(100, -1, 10000)).toThrow(MinorUnitsError);
  });
});

describe('apportionByBasisPoints', () => {
  it('returns exact proportional allocations for a divisible amount', () => {
    expect(apportionByBasisPoints(10_000, [1500, 8000, 500])).toEqual([
      1500, 8000, 500,
    ]);
  });

  it('returns zeroes for a zero amount', () => {
    expect(apportionByBasisPoints(0, [3333, 3333, 3334])).toEqual([0, 0, 0]);
  });

  it('assigns a single minor unit to exactly one recipient', () => {
    const allocations = apportionByBasisPoints(1, [1000, 1000, 1000, 1000]);
    expect(sum(allocations)).toBe(1);
    expect(allocations.filter((amount) => amount === 1)).toHaveLength(1);
    expect(allocations.every((amount) => Number.isInteger(amount))).toBe(true);
  });

  it('keeps a maximum safely scalable amount exact', () => {
    const amount = Math.floor(
      Number.MAX_SAFE_INTEGER / TOTAL_BASIS_POINTS,
    );
    const allocations = apportionByBasisPoints(amount, [1, 9999]);
    expect(sum(allocations)).toBe(amount);
    expect(allocations.every((value) => Number.isInteger(value))).toBe(true);
  });

  it('rejects fractional, non-finite, negative, and unsafe inputs', () => {
    expect(() => apportionByBasisPoints(1.5, [10000])).toThrow(
      MinorUnitsError,
    );
    expect(() => apportionByBasisPoints(1, [10000.5])).toThrow(
      MinorUnitsError,
    );
    expect(() => apportionByBasisPoints(Number.NaN, [10000])).toThrow(
      MinorUnitsError,
    );
    expect(() => apportionByBasisPoints(1, [-1, 10001])).toThrow(
      MinorUnitsError,
    );
    expect(() =>
      apportionByBasisPoints(Number.MAX_SAFE_INTEGER, [5000, 5000]),
    ).toThrow(/too large to scale exactly/);
  });

  it('rejects an empty or incomplete basis-point policy', () => {
    expect(() => apportionByBasisPoints(100, [])).toThrow(/at least one/);
    expect(() => apportionByBasisPoints(100, [5000, 4000])).toThrow(
      /must sum to 10000/,
    );
  });

  it('does not accumulate rounding drift over a large seeded range', () => {
    const random = seededRandom(0x1785_2026);
    const maximumAmount = Math.floor(
      Number.MAX_SAFE_INTEGER / TOTAL_BASIS_POINTS,
    );

    for (let iteration = 0; iteration < 2_000; iteration += 1) {
      const amount = random() % (maximumAmount + 1);
      const recipientCount = 2 + (random() % 8);
      const basisPoints: number[] = [];
      let remaining = TOTAL_BASIS_POINTS;

      for (let index = 0; index < recipientCount - 1; index += 1) {
        const share =
          index === recipientCount - 2
            ? remaining
            : random() % (remaining + 1);
        basisPoints.push(share);
        remaining -= share;
      }
      basisPoints.push(remaining);

      const allocations = apportionByBasisPoints(amount, basisPoints);
      expect(sum(allocations)).toBe(amount);
      expect(allocations.every((value) => Number.isInteger(value))).toBe(true);
      expect(allocations.every((value) => value >= 0)).toBe(true);
    }
  });
});
