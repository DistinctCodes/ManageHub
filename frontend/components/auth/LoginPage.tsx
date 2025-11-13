'use client';

import { useState } from 'react';
import { Mail, Fingerprint } from 'lucide-react';
import { ToggleBar } from '@/components/ui/ToggleBar';
import { EmailLoginForm } from '@/components/auth/EmailLoginForm';
import { BiometricLoginView } from '@/components/auth/BiometricLoginView';
import { Button } from '../ui/Button';

type LoginMode = 'email' | 'biometric';

interface LoginPageProps {
  onEmailLogin?: (data: { email: string; password: string; rememberMe?: boolean }) => void;
  onBiometricScan?: () => void;
  isLoading?: boolean;
}

export function LoginPage({ onEmailLogin, onBiometricScan, isLoading }: LoginPageProps) {
  const [loginMode, setLoginMode] = useState<LoginMode>('email');
  const [isScanning, setIsScanning] = useState(false);

  const toggleOptions = [
    {
      id: 'email',
      label: 'Email Login',
      icon: <Mail className="h-4 w-4" />,
    },
    {
      id: 'biometric',
      label: 'Biometric',
      icon: <Fingerprint className="h-4 w-4" />,
    },
  ];

  const handleEmailLogin = (data: { email: string; password: string; rememberMe?: boolean }) => {
    console.log("first")
    onEmailLogin?.(data);
  };

  const handleBiometricScan = () => {
    setIsScanning(true);
    onBiometricScan?.();
    // Reset scanning state after 3 seconds (for demo purposes)
    setTimeout(() => setIsScanning(false), 3000);
  };

  const switchToEmail = () => {
    setLoginMode('email');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-6 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">ManageHub</h1>
          <p className="text-gray-600 text-sm sm:text-base">Sign in to your workspace</p>
        </div>

        {/* Login Toggle */}
        <div className="mb-6 sm:mb-8">
          <ToggleBar
            options={toggleOptions}
            value={loginMode}
            onChange={(value) => setLoginMode(value as LoginMode)}
          />
        </div>

        {/* Login Card */}
        <div
          className="py-6 px-4 sm:py-8 sm:px-6 shadow-sm rounded-lg border border-gray-200"
          role="tabpanel"
          id={`${loginMode}-panel`}
          aria-labelledby={`${loginMode}-tab`}
        >
          {loginMode === 'email' ? (
            <EmailLoginForm onSubmit={handleEmailLogin} isLoading={isLoading} />) : (
            <BiometricLoginView
              onStartScan={handleBiometricScan}
              onSwitchToEmail={switchToEmail}
              isScanning={isScanning}
            />
          )}
        </div>

        {/* Sign Up Link */}
        <div className="mt-6 sm:mt-8 text-center">
          <p className="text-gray-600 text-sm sm:text-base">
            Don&apos;t have an account?{' '}
            <button className="text-[#2563EB] hover:text-blue-700 focus:outline-none focus:underline font-medium transition-colors">
              Sign up here
            </button>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 sm:mt-16 text-center px-4">
        <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
          © 2025 ManageHub. All rights reserved.
        </p>
        <div className="flex flex-col space-y-2 sm:flex-row sm:justify-center sm:space-y-0 sm:space-x-6">
          <button className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:underline transition-colors">
            Privacy Policy
          </button>
          <button className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:underline transition-colors">
            Terms of Service
          </button>
          <button className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:underline transition-colors">
            Support
          </button>
        </div>
      </footer>
    </div>
  );
}
