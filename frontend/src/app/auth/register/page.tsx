'use client';

import React from 'react';
import RegisterForm from '@/components/auth/register-form';
import { Separator } from '@/components/ui/separator';

const RegisterPage = () => {
  return (
    <div className="container py-8 flex flex-col items-center justify-center min-h-screen">
      <div className="w-full max-w-md">
        <RegisterForm />
        
        <Separator className="my-6" />
        
        <div className="text-center text-sm text-muted-foreground">
          By creating an account, you agree to our{' '}
          <a href="/terms-of-service" className="text-blue-500 hover:underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy-policy" className="text-blue-500 hover:underline">
            Privacy Policy
          </a>.
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;