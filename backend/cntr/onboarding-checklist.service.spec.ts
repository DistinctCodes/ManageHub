import { computeOnboardingProgress, MemberProfile } from './onboarding-checklist.service';

const allDone: MemberProfile = {
  hasProfilePhoto: true,
  hasFirstBooking: true,
  hasTwoFactorEnabled: true,
  isEmailVerified: true,
};

const allPending: MemberProfile = {
  hasProfilePhoto: false,
  hasFirstBooking: false,
  hasTwoFactorEnabled: false,
  isEmailVerified: false,
};

describe('computeOnboardingProgress', () => {
  it('returns exactly 4 steps', () => {
    const result = computeOnboardingProgress(allPending);
    expect(result.steps).toHaveLength(4);
  });

  it('totalCount is always 4', () => {
    expect(computeOnboardingProgress(allDone).totalCount).toBe(4);
    expect(computeOnboardingProgress(allPending).totalCount).toBe(4);
  });

  it('completedCount is 4 when all steps are done', () => {
    const result = computeOnboardingProgress(allDone);
    expect(result.completedCount).toBe(4);
  });

  it('isComplete is true only when all 4 steps are done', () => {
    expect(computeOnboardingProgress(allDone).isComplete).toBe(true);
  });

  it('isComplete is false when fewer than 4 steps are done', () => {
    const partial: MemberProfile = { ...allDone, hasTwoFactorEnabled: false };
    expect(computeOnboardingProgress(partial).isComplete).toBe(false);
  });

  it('completedCount equals the number of completed steps', () => {
    const partial: MemberProfile = {
      hasProfilePhoto: true,
      hasFirstBooking: true,
      hasTwoFactorEnabled: false,
      isEmailVerified: false,
    };
    expect(computeOnboardingProgress(partial).completedCount).toBe(2);
  });

  it('completedCount is 0 when no steps are done', () => {
    expect(computeOnboardingProgress(allPending).completedCount).toBe(0);
  });

  it('each step has key, label, description, and isComplete fields', () => {
    const result = computeOnboardingProgress(allPending);
    for (const step of result.steps) {
      expect(step).toHaveProperty('key');
      expect(step).toHaveProperty('label');
      expect(step).toHaveProperty('description');
      expect(step).toHaveProperty('isComplete');
    }
  });

  it('profile_photo step isComplete reflects hasProfilePhoto', () => {
    const result = computeOnboardingProgress({ ...allPending, hasProfilePhoto: true });
    const step = result.steps.find((s) => s.key === 'profile_photo');
    expect(step?.isComplete).toBe(true);
  });

  it('two_factor step isComplete reflects hasTwoFactorEnabled', () => {
    const result = computeOnboardingProgress({ ...allPending, hasTwoFactorEnabled: true });
    const step = result.steps.find((s) => s.key === 'two_factor');
    expect(step?.isComplete).toBe(true);
  });
});
