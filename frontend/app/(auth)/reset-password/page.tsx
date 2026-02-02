"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Lock, CheckCircle2, Info, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";

// Zod Schema with comprehensive password validation
const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain at least one special character"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

// Password strength calculator
const calculatePasswordStrength = (
  password: string
): { strength: number; label: string; color: string } => {
  if (!password) return { strength: 0, label: "", color: "" };

  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (password.length >= 12) strength += 10;
  if (/[a-z]/.test(password)) strength += 15;
  if (/[A-Z]/.test(password)) strength += 15;
  if (/[0-9]/.test(password)) strength += 15;
  if (/[^A-Za-z0-9]/.test(password)) strength += 20;

  if (strength <= 35) return { strength, label: "Weak", color: "#EF4444" };
  if (strength <= 60) return { strength, label: "Fair", color: "#F59E0B" };
  if (strength <= 85) return { strength, label: "Good", color: "#10B981" };
  return { strength: 100, label: "Strong", color: "#0D9488" };
};

const ResetPasswordPage: React.FC = () => {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onChange",
  });

  const password = watch("password", "");
  const confirmPassword = watch("confirmPassword", "");
  const passwordStrength = calculatePasswordStrength(password);
  const passwordsMatch =
    password && confirmPassword && password === confirmPassword;

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      toast.error("Missing reset token. Please use the link from your email.");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post("/users/reset-password", {
        token,
        newPassword: data.password,
      });
      setShowSuccess(true);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to reset password";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSubmitting) {
      handleSubmit(onSubmit)();
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Password Reset Complete
            </h1>
            <p className="text-gray-600">
              Your password has been successfully updated
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center">
                <CheckCircle2
                  className="w-12 h-12 text-teal-600"
                  strokeWidth={2.5}
                />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
              Success!
            </h2>
            <p className="text-gray-600 text-center mb-6">
              Your password has been reset successfully. You can now sign in
              with your new password.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-blue-900 mb-1">
                    Keep your password secure
                  </p>
                  <p className="text-blue-700">
                    Never share your password with anyone and consider enabling
                    two-factor authentication for extra security.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => (window.location.href = "/login")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Continue to Sign In
              <span className="text-xl">→</span>
            </button>
          </div>

          <footer className="text-center mt-8 text-sm text-gray-600">
            <p className="mb-2">© 2025 ManageHub. All rights reserved.</p>
            <div className="flex justify-center gap-4">
              <a
                href="/privacy-policy"
                className="hover:text-gray-900 transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="/terms-of-service"
                className="hover:text-gray-900 transition-colors"
              >
                Terms of Service
              </a>
              <a
                href="/contact"
                className="hover:text-gray-900 transition-colors"
              >
                Support
              </a>
            </div>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Reset Password
          </h1>
          <p className="text-gray-600">
            Create a strong password for your account
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white rounded-xl shadow-lg p-8 border border-gray-200"
        >
          {/* New Password Field */}
          <div className="mb-6">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                {...register("password")}
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your new password"
                disabled={isSubmitting}
                onKeyPress={handleKeyPress}
                className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  errors.password
                    ? "border-red-300 focus:ring-red-500"
                    : password
                    ? "border-teal-300 focus:ring-teal-500"
                    : "border-gray-300 focus:ring-blue-500"
                } disabled:bg-gray-50 disabled:cursor-not-allowed`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Password Strength Meter */}
            {password && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600">
                    Password Strength:
                  </span>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: passwordStrength.color }}
                  >
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-300 rounded-full"
                    style={{
                      width: `${passwordStrength.strength}%`,
                      backgroundColor: passwordStrength.color,
                    }}
                  />
                </div>
              </div>
            )}

            {errors.password && (
              <p className="mt-2 text-sm text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="mb-6">
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                {...register("confirmPassword")}
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter your new password"
                disabled={isSubmitting}
                onKeyPress={handleKeyPress}
                className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  errors.confirmPassword
                    ? "border-red-300 focus:ring-red-500"
                    : passwordsMatch
                    ? "border-teal-300 focus:ring-teal-500"
                    : "border-gray-300 focus:ring-blue-500"
                } disabled:bg-gray-50 disabled:cursor-not-allowed`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Password Match Indicator */}
            {confirmPassword && (
              <div className="mt-2 flex items-center gap-2">
                {passwordsMatch ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    <span className="text-sm text-teal-600 font-medium">
                      Passwords match
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-red-600">
                    Passwords do not match
                  </span>
                )}
              </div>
            )}

            {errors.confirmPassword && (
              <p className="mt-2 text-sm text-red-600">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Resetting Password...
              </>
            ) : (
              "Reset Password"
            )}
          </button>
        </form>

        {/* Security Tip */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-blue-900 mb-1">Security Tip</p>
              <p className="text-blue-700">
                Use a unique password that you don&#39;t use for other accounts.
                Consider using a password manager to keep track of your
                passwords securely.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-8 text-sm text-gray-600">
          <p className="mb-2">© 2025 ManageHub. All rights reserved.</p>
          <div className="flex justify-center gap-4">
            <a
              href="/privacy-policy"
              className="hover:text-gray-900 transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="/terms-of-service"
              className="hover:text-gray-900 transition-colors"
            >
              Terms of Service
            </a>
            <a
              href="/contact"
              className="hover:text-gray-900 transition-colors"
            >
              Support
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
