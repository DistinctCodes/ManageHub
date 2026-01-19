// frontend/src/app/auth/login/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { LoginFormData, loginSchema } from "@/schemas/login.schema";
import { useLogin } from "@/hooks/use-login";
import { cn } from "@/lib/utils";

function LoginContent() {
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified");
  const reset = searchParams.get("reset");

  const [showPassword, setShowPassword] = useState(false);
  const { mutate: login, isPending } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormData) => {
    login(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to home
          </Link>
        </div>

        {/* Main Content */}
        <div className="mx-auto max-w-md">
          {/* Verification Success Banner */}
          {verified === "true" && (
            <div className="mb-6 rounded-lg border-2 border-green-200 bg-green-50 p-4">
              <div className="flex items-start">
                <CheckCircle2 className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                <div>
                  <h3 className="text-sm font-semibold text-green-900">
                    Email Verified Successfully!
                  </h3>
                  <p className="mt-1 text-sm text-green-700">
                    Your email has been verified. Please sign in to continue.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* NEW: Password Reset Success Banner */}
          {reset === "success" && (
            <div className="mb-6 rounded-lg border-2 border-green-200 bg-green-50 p-4">
              <div className="flex items-start">
                <CheckCircle2 className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                <div>
                  <h3 className="text-sm font-semibold text-green-900">
                    Password Reset Successful!
                  </h3>
                  <p className="mt-1 text-sm text-green-700">
                    Your password has been changed. Please sign in with your new
                    password.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-white p-8 shadow-lg md:p-10">
            {/* Title */}
            <div className="mb-8 text-center">
              <h1 className="mb-2 text-3xl font-bold text-gray-900">
                Welcome Back
              </h1>
              <p className="text-gray-600">
                Sign in to access your ManageHub account
              </p>
            </div>

            {/* Login Form */}
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
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Password
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative mt-1">
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    id="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={cn(
                      "block w-full rounded-lg border px-4 py-2.5 pr-10 text-gray-900 transition-colors",
                      "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                      errors.password ? "border-red-500" : "border-gray-300",
                    )}
                    disabled={isPending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember Me */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rememberMe"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                  disabled={isPending}
                />
                <label
                  htmlFor="rememberMe"
                  className="ml-2 block text-sm text-gray-700"
                >
                  Remember me for 30 days
                </label>
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
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="px-4 text-sm text-gray-500">OR</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            {/* Sign Up Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link
                  href="/auth/register"
                  className="font-medium text-blue-600 hover:underline"
                >
                  Sign up for free
                </Link>
              </p>
            </div>

            {/* Admin Login Link (Optional) */}
            <div className="mt-6 border-t border-gray-200 pt-6 text-center">
              <Link
                href="/auth/admin-login"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Staff Login →
              </Link>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Need help?{" "}
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
