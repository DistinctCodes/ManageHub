import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface RegisterData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

interface RegisterResponse {
  message: string;
  success: boolean;
}

export const useRegister = () => {
  const router = useRouter();

  return useMutation<RegisterResponse, Error, RegisterData>({
    mutationFn: async (data: RegisterData) => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      const result = await response.json();
      
      // Store email in localStorage for verification page
      localStorage.setItem('pendingVerificationEmail', data.email);
      
      return result;
    },
    onSuccess: (data: RegisterResponse) => {
      toast.success(data.message || 'Registration successful!');
      // Redirect to email verification page
      setTimeout(() => {
        router.push('/auth/verify-email');
      }, 1500);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Registration failed. Please try again.');
    },
  });
};