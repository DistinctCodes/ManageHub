// frontend/src/app/auth/forgot-password/page.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { ArrowLeft, Mail, Loader2, AlertCircle } from "lucide-react";
import {
  ForgotPasswordFormData,
  forgotPasswordSchema,
} from "@/schemas/forgot-password.schema";
import { useForgotPassword } from "@/hooks/use-forgot-password";
import { cn } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const { mutate: forgotPassword, isPending } = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = (data: ForgotPasswordFormData) => {
    forgotPassword(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/auth/login"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to login
          </Link>
        </div>

        {/* Main Content */}
        <div className="mx-auto max-w-md">
          <div className="rounded-2xl bg-white p-8 shadow-lg md:p-10">
            {/* Icon */}
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-blue-100 p-4">
                <Mail className="h-12 w-12 text-blue-600" />
              </div>
            </div>

            {/* Title */}
            <div className="mb-8 text-center">
              <h1 className="mb-2 text-3xl font-bold text-gray-900">
                Forgot Password?
              </h1>
              <p className="text-gray-600">
                No worries! Enter your email and we'll send you reset
                instructions.
              </p>
            </div>

            {/* Info Box */}
            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start">
                <AlertCircle className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium">
                    Password reset instructions will be sent to your registered
                    email address.
                  </p>
                  <p className="mt-1 text-blue-800">
                    The reset link will be valid for 1 hour.
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email Address
                </label>
                <input
                  {...register("email")}
                  type="email"
                  id="email"
                  placeholder="john@example.com"
                  autoComplete="email"
                  className={cn(
                    "mt-1 block w-full rounded-lg border px-4 py-2.5 text-gray-900 transition-colors",
                    "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                    errors.email ? "border-red-500" : "border-gray-300",
                  )}
                  disabled={isPending}
                  autoFocus
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isPending}
                className={cn(
                  "w-full rounded-lg bg-blue-600 px-6 py-3 text-white font-medium",
                  "transition-colors hover:bg-blue-700",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                )}
              >
                {isPending ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Sending reset link...
                  </span>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="px-4 text-sm text-gray-500">OR</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            {/* Alternative Actions */}
            <div className="space-y-3 text-center text-sm">
              <p className="text-gray-600">
                Remember your password?{" "}
                <Link
                  href="/auth/login"
                  className="font-medium text-blue-600 hover:underline"
                >
                  Sign in
                </Link>
              </p>
              <p className="text-gray-600">
                Don't have an account?{" "}
                <Link
                  href="/auth/register"
                  className="font-medium text-blue-600 hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Still having trouble?{" "}
              <Link
                href="/contact"
                className="font-medium text-blue-600 hover:underline"
              >
                Contact support
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
