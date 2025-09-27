'use client';

import { LoginPage } from '@/components/auth/LoginPage';

export default function Home() {
  const handleEmailLogin = (data: { email: string; password: string; rememberMe?: boolean }) => {
    console.log('Email login:', data);
    // TODO: Implement actual authentication logic
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
