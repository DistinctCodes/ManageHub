import {
  allocateByBasisPoints,
  assertBasisPointsSumToTotal,
  BasisPointShare,
  SplitAllocationError,
  TOTAL_BASIS_POINTS,
} from './split-allocation';

const shares = (...basisPoints: number[]): BasisPointShare[] =>
  basisPoints.map((bp, index) => ({ key: `r${index}`, basisPoints: bp }));

const total = (allocations: Array<{ amount: number }>) =>
  allocations.reduce((sum, allocation) => sum + allocation.amount, 0);

describe('assertBasisPointsSumToTotal', () => {
  it('accepts a set that sums to exactly 100%', () => {
    expect(() =>
      assertBasisPointsSumToTotal(shares(1500, 8000, 500)),
    ).not.toThrow();
  });

  it('rejects a set that sums to less than 100%', () => {
    expect(() => assertBasisPointsSumToTotal(shares(1500, 8000))).toThrow(
      SplitAllocationError,
    );
  });

  it('rejects a set that sums to more than 100%', () => {
    expect(() => assertBasisPointsSumToTotal(shares(5000, 6000))).toThrow(
      /must sum to 10000/,
    );
  });

  it('rejects an empty recipient list', () => {
    expect(() => assertBasisPointsSumToTotal([])).toThrow(
      /at least one recipient/,
    );
  });

  it('rejects a zero or negative share', () => {
    expect(() => assertBasisPointsSumToTotal(shares(0, 10000))).toThrow(
      /positive integer share/,
    );
    expect(() => assertBasisPointsSumToTotal(shares(-100, 10100))).toThrow(
      /positive integer share/,
    );
  });

  it('rejects a fractional share', () => {
    expect(() => assertBasisPointsSumToTotal(shares(1500.5, 8499.5))).toThrow(
      /positive integer share/,
    );
  });
});

describe('allocateByBasisPoints', () => {
  it('splits an exactly-divisible amount with no remainder at all', () => {
    const allocations = allocateByBasisPoints(10000, shares(1500, 8000, 500));
    expect(allocations.map((a) => a.amount)).toEqual([1500, 8000, 500]);
    expect(allocations.every((a) => a.remainderUnits === 0)).toBe(true);
  });

  /**
   * The case that motivates the whole rounding policy: three equal-ish
   * shares of 1000 floor to 333/333/333 and lose a unit. It has to land
   * somewhere, exactly once.
   */
  it('allocates a leftover unit rather than dropping it', () => {
    const allocations = allocateByBasisPoints(1000, shares(3333, 3333, 3334));
    expect(total(allocations)).toBe(1000);
    expect(allocations.map((a) => a.amount)).toEqual([333, 333, 334]);
    expect(allocations.map((a) => a.remainderUnits)).toEqual([0, 0, 1]);
  });

  it('never creates value: the allocated total equals the input exactly', () => {
    const configs = [
      shares(3333, 3333, 3334),
      shares(1, 9999),
      shares(2500, 2500, 2500, 2500),
      shares(1667, 1667, 1666, 1667, 1667, 1666),
      shares(1000, 2000, 3000, 4000),
      shares(9998, 1, 1),
    ];
    const amounts = [
      0, 1, 2, 3, 7, 9, 10, 11, 99, 100, 101, 999, 1000, 1001, 12345, 99999,
      1_000_003, 7_777_777,
    ];

    for (const config of configs) {
      for (const amount of amounts) {
        const allocations = allocateByBasisPoints(amount, config);
        expect(total(allocations)).toBe(amount);
        expect(allocations.every((a) => a.amount >= 0)).toBe(true);
        // The remainder pass hands out strictly fewer units than there are
        // recipients, so nobody can be topped up twice in one allocation.
        const remainderUnits = allocations.reduce(
          (sum, a) => sum + a.remainderUnits,
          0,
        );
        expect(remainderUnits).toBeLessThan(config.length);
      }
    }
  });

  it('stays within one minor unit of the exact proportional share', () => {
    const config = shares(1667, 1667, 1666, 1667, 1667, 1666);
    const allocations = allocateByBasisPoints(99999, config);
    for (const allocation of allocations) {
      const exact = (99999 * allocation.share.basisPoints) / TOTAL_BASIS_POINTS;
      expect(Math.abs(allocation.amount - exact)).toBeLessThan(1);
    }
  });

  it('is deterministic: the same inputs always allocate identically', () => {
    const config = shares(3333, 3333, 3334);
    const first = allocateByBasisPoints(1_000_001, config);
    const second = allocateByBasisPoints(1_000_001, config);
    expect(first.map((a) => a.amount)).toEqual(second.map((a) => a.amount));
  });

  /**
   * With identical remainders the tie has to break somewhere, and it must
   * break the same way every run — otherwise two auditors reconciling the
   * same batch get different answers.
   */
  it('breaks a remainder tie by sortOrder, then by input position', () => {
    const config: BasisPointShare[] = [
      { key: 'late', basisPoints: 3333, sortOrder: 9 },
      { key: 'early', basisPoints: 3333, sortOrder: 1 },
      { key: 'middle', basisPoints: 3334, sortOrder: 5 },
    ];
    // 3334 has the largest remainder and takes the first unit; 'early'
    // then wins the tie against 'late' on sortOrder.
    const allocations = allocateByBasisPoints(2000, config);
    const byKey = new Map(allocations.map((a) => [a.share.key, a.amount]));
    expect(total(allocations)).toBe(2000);
    expect(byKey.get('middle')).toBe(667);
    expect(byKey.get('early')).toBe(667);
    expect(byKey.get('late')).toBe(666);
  });

  it('gives everyone zero for a zero amount, and still balances', () => {
    const allocations = allocateByBasisPoints(0, shares(3333, 3333, 3334));
    expect(total(allocations)).toBe(0);
    expect(allocations.map((a) => a.amount)).toEqual([0, 0, 0]);
  });

  it('hands a single minor unit to exactly one recipient', () => {
    const allocations = allocateByBasisPoints(1, shares(3333, 3333, 3334));
    expect(total(allocations)).toBe(1);
    expect(allocations.filter((a) => a.amount === 1)).toHaveLength(1);
  });

  it('rejects a negative or fractional amount', () => {
    expect(() => allocateByBasisPoints(-1, shares(10000))).toThrow(
      SplitAllocationError,
    );
    expect(() => allocateByBasisPoints(1.5, shares(10000))).toThrow(
      /non-negative integer/,
    );
  });

  it('rejects an amount too large to apportion exactly', () => {
    expect(() =>
      allocateByBasisPoints(Number.MAX_SAFE_INTEGER, shares(10000)),
    ).toThrow(/too large to apportion/);
  });

  it('rejects a config that does not sum to 100%', () => {
    expect(() => allocateByBasisPoints(1000, shares(5000, 4000))).toThrow(
      SplitAllocationError,
    );
  });
});
