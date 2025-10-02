'use client';

import { RegisterPage } from '@/components/auth/RegisterPage';

export default function RegisterPageRoute() {
  const handleRegister = (data: {
    // Step 1: Personal Info
    fullName: string;
    email: string;
    phoneNumber: string;
    location?: string;
    // Step 2: Account Setup
    userType: 'member' | 'staff' | 'visitor';
    organizationName: string;
    password: string;
    confirmPassword: string;
    agreeToTerms: boolean;
  }) => {
    console.log('Registration data:', data);
    // TODO: Implement actual registration logic
    // For now, just log the data and potentially redirect to dashboard
  };

  return (
    <RegisterPage
      onRegister={handleRegister}
    />
  );
}
