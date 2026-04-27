// CT-39: Test helpers for the referral contract (TypeScript side)

export interface ReferralTestFixture {
  referrer: string;
  referee: string;
  code: string;
  rewardAmount: bigint;
}

export function makeFixture(overrides: Partial<ReferralTestFixture> = {}): ReferralTestFixture {
  return {
    referrer: 'GREFERRER000000000000000000000000000000000000000000000000',
    referee: 'GREFEREE0000000000000000000000000000000000000000000000000',
    code: 'REF-TEST-001',
    rewardAmount: 100n,
    ...overrides,
  };
}

export function assertRejects(fn: () => Promise<unknown>, message: string): Promise<void> {
  return fn().then(
    () => { throw new Error(`Expected rejection: ${message}`); },
    () => undefined,
  );
}

export function assertRewardPaid(rewardPaid: boolean): void {
  if (!rewardPaid) throw new Error('Expected reward to be marked as paid');
}

export function assertUsageCount(actual: number, expected: number): void {
  if (actual !== expected) {
    throw new Error(`Usage count mismatch: expected ${expected}, got ${actual}`);
  }
}

export function assertSelfReferralBlocked(referrer: string, referee: string): void {
  if (referrer === referee) throw new Error('Self-referral must be rejected by the contract');
}
