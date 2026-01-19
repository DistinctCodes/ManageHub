// frontend/src/app/auth/reset-password/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
  Lock,
  AlertCircle,
} from "lucide-react";
import {
  ResetPasswordFormData,
  resetPasswordSchema,
} from "@/schemas/reset-password.schema";
import { useResetPassword } from "@/hooks/use-reset-password";
import { cn } from "@/lib/utils";

type PageStatus = "ready" | "invalid" | "submitting" | "success";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pageStatus, setPageStatus] = useState<PageStatus>("ready");
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: "",
    color: "",
  });

  const { mutate: resetPassword, isPending } = useResetPassword();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const password = watch("password");

  // Check for token on mount
  useEffect(() => {
    if (!token) {
      setPageStatus("invalid");
    }
  }, [token]);

  // Calculate password strength
  useEffect(() => {
    if (!password) {
      setPasswordStrength({ score: 0, label: "", color: "" });
      return;
    }

    let score = 0;

    // Length
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;

    // Character types
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[@$!%*?&#]/.test(password)) score++;

    // Determine strength
    let label = "";
    let color = "";

    if (score <= 2) {
      label = "Weak";
      color = "bg-red-500";
    } else if (score <= 4) {
      label = "Fair";
      color = "bg-yellow-500";
    } else if (score <= 5) {
      label = "Good";
      color = "bg-blue-500";
    } else {
      label = "Strong";
      color = "bg-green-500";
    }

    setPasswordStrength({ score, label, color });
  }, [password]);

  const onSubmit = (data: ResetPasswordFormData) => {
    if (!token) return;

    setPageStatus("submitting");
    resetPassword(
      { token, password: data.password },
      {
        onSuccess: () => {
          setPageStatus("success");
        },
        onError: () => {
          setPageStatus("ready");
        },
      },
    );
  };

  // Invalid Token State
  if (pageStatus === "invalid") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-md">
            <div className="rounded-2xl bg-white p-8 shadow-lg md:p-10">
              {/* Error Icon */}
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-red-100 p-4">
                  <XCircle className="h-16 w-16 text-red-600" />
                </div>
              </div>

              {/* Error Message */}
              <div className="text-center">
                <h1 className="mb-3 text-2xl font-bold text-gray-900">
                  Invalid Reset Link
                </h1>
                <p className="mb-6 text-gray-600">
                  This password reset link is invalid or missing.
                </p>

                {/* Info Box */}
                <div className="mb-6 rounded-lg bg-red-50 p-4 text-left">
                  <p className="mb-2 text-sm font-semibold text-gray-900">
                    Possible reasons:
                  </p>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>• The link was not copied completely</li>
                    <li>• The link has already been used</li>
                    <li>• The link has expired (valid for 1 hour)</li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Link
                    href="/auth/forgot-password"
                    className={cn(
                      "flex w-full items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-white font-medium",
                      "transition-colors hover:bg-blue-700",
                      "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                    )}
                  >
                    Request New Reset Link
                  </Link>

                  <Link
                    href="/auth/login"
                    className={cn(
                      "flex w-full items-center justify-center rounded-lg border-2 border-gray-300 px-6 py-3 font-medium text-gray-700",
                      "transition-colors hover:bg-gray-50",
                      "focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2",
                    )}
                  >
                    Back to Login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success State
  if (pageStatus === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-md">
            <div className="rounded-2xl bg-white p-8 shadow-lg md:p-10">
              {/* Success Icon */}
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-green-100 p-4">
                  <CheckCircle2 className="h-16 w-16 text-green-600" />
                </div>
              </div>

              {/* Success Message */}
              <div className="text-center">
                <h1 className="mb-3 text-2xl font-bold text-gray-900">
                  Password Reset Successful!
                </h1>
                <p className="mb-6 text-gray-600">
                  Your password has been changed successfully. You can now sign
                  in with your new password.
                </p>

                {/* Auto-redirect notice */}
                <p className="mb-6 text-sm text-gray-500">
                  Redirecting to login page in 2 seconds...
                </p>

                {/* Action Button */}
                <Link
                  href="/auth/login"
                  className={cn(
                    "flex w-full items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-white font-medium",
                    "transition-colors hover:bg-blue-700",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  )}
                >
                  Continue to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Form State
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/auth/login"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to login
          </Link>
        </div>

        {/* Main Content */}
        <div className="mx-auto max-w-md">
          <div className="rounded-2xl bg-white p-8 shadow-lg md:p-10">
            {/* Icon */}
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-blue-100 p-4">
                <Lock className="h-12 w-12 text-blue-600" />
              </div>
            </div>

            {/* Title */}
            <div className="mb-8 text-center">
              <h1 className="mb-2 text-3xl font-bold text-gray-900">
                Create New Password
              </h1>
              <p className="text-gray-600">
                Choose a strong password that you haven't used before.
              </p>
            </div>

            {/* Security Info */}
            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start">
                <AlertCircle className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium">Password Requirements:</p>
                  <ul className="mt-2 space-y-1 text-blue-800">
                    <li>• At least 8 characters long</li>
                    <li>• Contains uppercase and lowercase letters</li>
                    <li>• Contains at least one number</li>
                    <li>
                      • Contains at least one special character (@$!%*?&#)
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* New Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  New Password
                </label>
                <div className="relative mt-1">
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    id="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={cn(
                      "block w-full rounded-lg border px-4 py-2.5 pr-10 text-gray-900 transition-colors",
                      "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                      errors.password ? "border-red-500" : "border-gray-300",
                    )}
                    disabled={isPending}
                    autoFocus
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

                {/* Password Strength Indicator */}
                {password && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>Password strength:</span>
                      <span
                        className={cn(
                          "font-medium",
                          passwordStrength.score <= 2 && "text-red-600",
                          passwordStrength.score === 3 && "text-yellow-600",
                          passwordStrength.score === 4 && "text-blue-600",
                          passwordStrength.score >= 5 && "text-green-600",
                        )}
                      >
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={cn(
                          "h-full transition-all duration-300",
                          passwordStrength.color,
                        )}
                        style={{
                          width: `${(passwordStrength.score / 6) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  Confirm New Password
                </label>
                <div className="relative mt-1">
                  <input
                    {...register("confirmPassword")}
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={cn(
                      "block w-full rounded-lg border px-4 py-2.5 pr-10 text-gray-900 transition-colors",
                      "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                      errors.confirmPassword
                        ? "border-red-500"
                        : "border-gray-300",
                    )}
                    disabled={isPending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.confirmPassword.message}
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
                    Resetting password...
                  </span>
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>

            {/* Additional Help */}
            <div className="mt-6 border-t border-gray-200 pt-6 text-center">
              <p className="text-sm text-gray-600">
                Remember your password?{" "}
                <Link
                  href="/auth/login"
                  className="font-medium text-blue-600 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          {/* Security Tips */}
          <div className="mt-6 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 p-6">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              🔒 Password Security Tips
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                <span>Use a unique password you haven't used elsewhere</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                <span>Avoid using personal information (names, birthdays)</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                <span>Consider using a password manager</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                <span>Never share your password with anyone</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
