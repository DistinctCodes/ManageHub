'use client';

import { RegisterPage } from '@/components/auth/RegisterPage';
import { useRegisterUser } from '@/lib/react-query/hooks/auth/useRegisterUser'; // <-- 1. Import the REAL hook

// Define the type (you already had this)
type RegisterFormData = {
  fullName: string;
  email: string;
  phoneNumber: string;
  location?: string;
  userType: 'member' | 'staff' | 'visitor';
  organizationName: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
};

export default function RegisterPageRoute() {
  // 2. Call the hook to get the mutation function and loading state
  // Inside app/(auth)/register/page.tsx

  const { mutate: registerUser, isPending } = useRegisterUser();

  const handleRegister = (data: RegisterFormData) => {
    const names = data.fullName.trim().split(' ');
    const firstname = names[0];
    const lastname = names.slice(1).join(' '); 

    const registrationPayload = {
      firstname: firstname,
      lastname: lastname,
      email: data.email,
      password: data.password,
    };
    
    registerUser(registrationPayload);
  };

  return (
    <RegisterPage
      onRegister={handleRegister}
      isLoading={isPending}
    />
  );
}