export interface MemberProfile {
  hasProfilePhoto: boolean;
  hasFirstBooking: boolean;
  hasTwoFactorEnabled: boolean;
  isEmailVerified: boolean;
}

export interface OnboardingStep {
  key: string;
  label: string;
  description: string;
  isComplete: boolean;
}

export interface OnboardingChecklist {
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
}

export function computeOnboardingProgress(member: MemberProfile): OnboardingChecklist {
  const steps: OnboardingStep[] = [
    {
      key: 'profile_photo',
      label: 'Upload Profile Photo',
      description: 'Add a profile photo to personalise your account.',
      isComplete: member.hasProfilePhoto,
    },
    {
      key: 'first_booking',
      label: 'Make Your First Booking',
      description: 'Book a workspace to get started.',
      isComplete: member.hasFirstBooking,
    },
    {
      key: 'two_factor',
      label: 'Enable Two-Factor Authentication',
      description: 'Secure your account with 2FA.',
      isComplete: member.hasTwoFactorEnabled,
    },
    {
      key: 'email_verified',
      label: 'Verify Your Email',
      description: 'Confirm your email address.',
      isComplete: member.isEmailVerified,
    },
  ];
  const completedCount = steps.filter((s) => s.isComplete).length;
  return {
    steps,
    completedCount,
    totalCount: steps.length,
    isComplete: completedCount === steps.length,
  };
}
