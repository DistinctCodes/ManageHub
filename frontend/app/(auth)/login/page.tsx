'use client';

import { LoginPage } from '@/components/auth/LoginPage';
import { useLoginUser } from '@/lib/react-query/hooks/auth/useLoginUser';
export default function LoginPageRoute() {

const { mutate: loginUser, isPending } = useLoginUser();

  const handleEmailLogin = (data: { email: string; password: string; rememberMe?: boolean }) => {
    loginUser(data); 
  };

  const handleBiometricScan = () => {
    console.log('Biometric scan initiated');
    // TODO: Implement actual biometric authentication
  };

  return (
    <LoginPage
      onEmailLogin={handleEmailLogin}
      onBiometricScan={handleBiometricScan}
      isLoading={isPending} 
    />
  );
}
