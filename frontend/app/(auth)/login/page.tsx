'use client';

import { LoginPage } from '@/components/auth/LoginPage';

export default function LoginPageRoute() {
  const handleEmailLogin = (data: { email: string; password: string; rememberMe?: boolean }) => {
    console.log('Email login:', data);
    // TODO: Implement actual authentication logic
    // For now, just log the data and potentially redirect to dashboard
  };

  const handleBiometricScan = () => {
    console.log('Biometric scan initiated');
    // TODO: Implement actual biometric authentication
  };

  return (
    <LoginPage
      onEmailLogin={handleEmailLogin}
      onBiometricScan={handleBiometricScan}
    />
  );
}
