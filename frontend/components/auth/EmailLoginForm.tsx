"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/cn';
import { loginSchema, type LoginSchema } from '@/lib/schemas/loginSchema';
import { toast } from 'sonner';
import Link from 'next/link';

type EmailLoginFormData = LoginSchema & { rememberMe?: boolean };

interface EmailLoginFormProps {
  onSubmit: (data: EmailLoginFormData) => void;
  className?: string;
  isLoading?:boolean;
}

export function EmailLoginForm({ onSubmit, className, isLoading }: EmailLoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailLoginFormData>({
    resolver: zodResolver(
      loginSchema.and(
        z.object({
          rememberMe: z.boolean().optional(),
        })
      )
    ),
    mode: 'onBlur',
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  useEffect(() => {
    if (errors.email?.message) {
      toast.error(errors.email.message);
    }
    if (errors.password?.message) {
      toast.error(errors.password.message);
    }
  }, [errors.email, errors.password]);

  const handleLocalSubmit = (data: EmailLoginFormData) => {
    onSubmit?.(data);
  };

  return (
    <form
      onSubmit={handleSubmit(handleLocalSubmit)}
      className={cn('space-y-6', className)}
    >
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" />
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            className="pl-10"
            error={errors.email?.message}
            {...register("email")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-gray-700">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            className="pl-10 pr-10 text-black"
            error={errors.password?.message}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-gray-600 focus:outline-none"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]"
            {...register("rememberMe")}
          />
          <span className="text-sm text-gray-600">Remember me</span>
        </label>
        <Link
          href={"/forgot-password"}
          className="text-sm text-[#2563EB] hover:text-blue-700 focus:outline-none focus:underline"
        >
          Forgot password?
        </Link>
      </div>

      <button
  type="submit"
  disabled={isLoading}
  className={`
    w-full 
    bg-blue-500 
    text-white 
    font-semibold 
    py-2 px-4 
    rounded-md 
    shadow-sm 
    hover:bg-blue-600 
    hover:cursor-pointer 
    focus:outline-none 
    focus:ring-2 
    focus:ring-blue-400 
    focus:ring-offset-1 
    transition-colors 
    duration-200 
    disabled:opacity-50 
    disabled:cursor-not-allowed
  `}
>
  {isLoading ? 'Signing in...' : 'Sign In'}
</button>

    </form>
  );
}
