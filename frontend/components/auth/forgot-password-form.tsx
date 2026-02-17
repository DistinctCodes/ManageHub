"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Lock,
  Loader2,
  Mail,
  Send,
} from "lucide-react";
import Link from "next/link";

import {
  forgotPasswordSchema,
  type ForgotPasswordForm as ForgotPasswordFormType,
} from "@/lib/schemas/auth";
import { useForgotPassword } from "@/lib/react-query/hooks/auth/useForgotPassword";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";

type Step = "email" | "otp" | "new-password" | "success";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[a-z]/, "Must contain at least one lowercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

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

export function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>("email");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [verifiedOtp, setVerifiedOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // OTP state
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Password state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const emailForm = useForm<ForgotPasswordFormType>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
    defaultValues: { email: "" },
  });

  const passwordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onChange",
  });

  const password = passwordForm.watch("password", "");
  const confirmPassword = passwordForm.watch("confirmPassword", "");
  const passwordStrength = calculatePasswordStrength(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const { mutate: sendResetOtp, isPending: isSendingEmail, error: emailError, reset: resetEmailError } = useForgotPassword();

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  useEffect(() => {
    if (step === "otp") {
      inputRefs.current[0]?.focus();
    }
  }, [step]);

  // Step 1: Submit email
  const onSubmitEmail = (data: ForgotPasswordFormType) => {
    resetEmailError();
    sendResetOtp(
      { email: data.email },
      {
        onSuccess: () => {
          setSubmittedEmail(data.email);
          setCooldown(60);
          setStep("otp");
        },
      },
    );
  };

  const onResendOtp = () => {
    if (cooldown > 0 || !submittedEmail) return;
    resetEmailError();
    sendResetOtp(
      { email: submittedEmail },
      {
        onSuccess: () => {
          setCooldown(60);
          setOtp(["", "", "", ""]);
          inputRefs.current[0]?.focus();
          toast.success("A new reset code has been sent");
        },
      },
    );
  };

  // Step 2: OTP handlers
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 3) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) newOtp[i] = pasted[i];
    setOtp(newOtp);
    inputRefs.current[Math.min(pasted.length, 3)]?.focus();
  };

  const onVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length !== 4) {
      toast.error("Please enter the full 4-digit code");
      return;
    }
    setIsVerifyingOtp(true);
    try {
      await apiClient.post("/auth/verify-reset-password-otp", {
        email: submittedEmail,
        otp: code,
      });
      setVerifiedOtp(code);
      setStep("new-password");
    } catch (error: any) {
      toast.error(error.message || "Invalid or expired code");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Step 3: Reset password
  const onResetPassword = async (data: ResetPasswordFormValues) => {
    setIsResetting(true);
    try {
      await apiClient.post("/auth/reset-password", {
        otp: verifiedOtp,
        newPassword: data.password,
        confirmNewPassword: data.confirmPassword,
      });
      setStep("success");
    } catch (error: any) {
      toast.error(error.message || "Failed to reset password");
    } finally {
      setIsResetting(false);
    }
  };

  const serverError = emailError instanceof Error ? emailError.message : emailError ? "Something went wrong" : null;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          {step === "email" && (
            <>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">Forgot Password?</h2>
              <p className="mt-2 text-gray-600">No worries, we&apos;ll send you a reset code</p>
            </>
          )}
          {step === "otp" && (
            <>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">Enter Reset Code</h2>
              <p className="mt-2 text-gray-600">
                We sent a 4-digit code to{" "}
                <span className="font-medium text-gray-900">{submittedEmail}</span>
              </p>
            </>
          )}
          {step === "new-password" && (
            <>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">Reset Password</h2>
              <p className="mt-2 text-gray-600">Create a strong password for your account</p>
            </>
          )}
          {step === "success" && (
            <>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">Password Reset Complete</h2>
              <p className="mt-2 text-gray-600">Your password has been successfully updated</p>
            </>
          )}
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {/* Step 1: Email */}
          {step === "email" && (
            <form onSubmit={emailForm.handleSubmit(onSubmitEmail)} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    {...emailForm.register("email")}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                      emailError ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Enter your email address"
                    disabled={isSendingEmail}
                  />
                </div>
                {serverError && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {serverError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSendingEmail}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Send Reset Code
                  </>
                )}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">OR</span>
                </div>
              </div>

              <Link
                href="/login"
                className="flex items-center justify-center text-blue-600 hover:text-blue-500 font-medium transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Link>
            </form>
          )}

          {/* Step 2: OTP */}
          {step === "otp" && (
            <div className="space-y-6">
              <div className="flex justify-center mb-2">
                <div className="bg-blue-100 p-4 rounded-full">
                  <Mail className="h-10 w-10 text-blue-600" />
                </div>
              </div>

              <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white text-gray-900 transition-all"
                  />
                ))}
              </div>

              <button
                onClick={onVerifyOtp}
                disabled={isVerifyingOtp || otp.join("").length !== 4}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isVerifyingOtp ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  "Verify Code"
                )}
              </button>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      Didn&apos;t receive the code?
                    </p>
                    <p className="text-sm text-blue-700">
                      Check your spam folder or click the resend button below
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={onResendOtp}
                disabled={cooldown > 0 || isSendingEmail}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {cooldown > 0 ? (
                  <>
                    <Clock className="h-5 w-5 mr-2" />
                    Resend in {cooldown}s
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Resend Code
                  </>
                )}
              </button>

              <Link
                href="/login"
                className="flex items-center justify-center text-blue-600 hover:text-blue-500 font-medium transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Link>
            </div>
          )}

          {/* Step 3: New password */}
          {step === "new-password" && (
            <form onSubmit={passwordForm.handleSubmit(onResetPassword)} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    {...passwordForm.register("password")}
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your new password"
                    disabled={isResetting}
                    className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                      passwordForm.formState.errors.password
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
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {password && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600">Password Strength:</span>
                      <span className="text-xs font-semibold" style={{ color: passwordStrength.color }}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-300 rounded-full"
                        style={{ width: `${passwordStrength.strength}%`, backgroundColor: passwordStrength.color }}
                      />
                    </div>
                  </div>
                )}
                {passwordForm.formState.errors.password && (
                  <p className="mt-2 text-sm text-red-600">{passwordForm.formState.errors.password.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    {...passwordForm.register("confirmPassword")}
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your new password"
                    disabled={isResetting}
                    className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                      passwordForm.formState.errors.confirmPassword
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
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {confirmPassword && (
                  <div className="mt-2 flex items-center gap-2">
                    {passwordsMatch ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-teal-600" />
                        <span className="text-sm text-teal-600 font-medium">Passwords match</span>
                      </>
                    ) : (
                      <span className="text-sm text-red-600">Passwords do not match</span>
                    )}
                  </div>
                )}
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600">{passwordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isResetting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>
          )}

          {/* Step 4: Success */}
          {step === "success" && (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-teal-600" strokeWidth={2.5} />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900">Success!</h2>
              <p className="text-gray-600">
                Your password has been reset successfully. You can now sign in with your new password.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-left">
                    <p className="font-semibold text-blue-900 mb-1">Keep your password secure</p>
                    <p className="text-blue-700">
                      Never share your password with anyone and consider enabling two-factor authentication.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => (window.location.href = "/login")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                Continue to Sign In
                <span className="text-xl">&rarr;</span>
              </button>
            </div>
          )}
        </div>

        {/* Help Section */}
        {step === "email" && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-900">Need help?</h3>
                <p className="mt-1 text-sm text-blue-700">
                  If you&apos;re having trouble accessing your account, contact our support team at{" "}
                  <a href="mailto:support@managehub.com" className="font-medium underline hover:text-blue-600">
                    support@managehub.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sign Up Link */}
        {step !== "success" && (
          <div className="text-center">
            <p className="text-gray-600">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-blue-600 hover:text-blue-500 font-medium">
                Sign up here
              </Link>
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>&copy; 2025 ManageHub. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <a href="#" className="hover:text-gray-700">Privacy Policy</a>
            <a href="#" className="hover:text-gray-700">Terms of Service</a>
            <a href="#" className="hover:text-gray-700">Support</a>
          </div>
        </div>
      </div>
    </div>
  );
}
