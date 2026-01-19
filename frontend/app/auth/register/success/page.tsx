// frontend/src/app/auth/register/success/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Mail,
  ArrowRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useResendVerification } from "@/hooks/use-resend-verification";
import { cn } from "@/lib/utils";

export default function RegisterSuccessPage() {
  const router = useRouter();
  const registrationEmail = useAuthStore((state) => state.registrationEmail);
  const clearRegistrationEmail = useAuthStore(
    (state) => state.clearRegistrationEmail,
  );
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const { mutate: resendVerification, isPending } = useResendVerification();

  // Redirect if no registration email (shouldn't be here)
  useEffect(() => {
    if (!registrationEmail) {
      router.push("/auth/register");
    }
  }, [registrationEmail, router]);

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleResendEmail = () => {
    if (registrationEmail && canResend) {
      resendVerification(registrationEmail, {
        onSuccess: () => {
          setCountdown(60);
          setCanResend(false);
        },
      });
    }
  };

  const handleGoToLogin = () => {
    clearRegistrationEmail();
    router.push("/auth/login");
  };

  if (!registrationEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to home
          </Link>
        </div>

        {/* Main Content */}
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl bg-white p-8 shadow-lg md:p-12">
            {/* Success Icon */}
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-green-100 p-4">
                <CheckCircle2 className="h-16 w-16 text-green-600" />
              </div>
            </div>

            {/* Main Message */}
            <div className="text-center">
              <h1 className="mb-3 text-3xl font-bold text-gray-900">
                Registration Successful!
              </h1>
              <p className="mb-8 text-lg text-gray-600">
                Welcome to the ManageHub community, we're excited to have you on
                board.
              </p>
            </div>

            {/* Email Verification Notice */}
            <div className="mb-8 rounded-lg border-2 border-blue-200 bg-blue-50 p-6">
              <div className="mb-4 flex items-start">
                <Mail className="mr-3 mt-1 h-6 w-6 flex-shrink-0 text-blue-600" />
                <div>
                  <h2 className="mb-2 text-lg font-semibold text-gray-900">
                    Verify Your Email Address
                  </h2>
                  <p className="mb-3 text-sm text-gray-700">
                    We've sent a verification email to:
                  </p>
                  <p className="mb-4 text-base font-medium text-blue-600">
                    {registrationEmail}
                  </p>
                  <p className="text-sm text-gray-700">
                    Please check your inbox and click the verification link to
                    activate your account. The link will expire in{" "}
                    <strong>24 hours</strong>.
                  </p>
                </div>
              </div>

              {/* Resend Email Button */}
              <div className="mt-4 border-t border-blue-200 pt-4">
                <p className="mb-3 text-sm text-gray-600">
                  Didn't receive the email? Check your spam folder or resend the
                  verification email.
                </p>
                <button
                  onClick={handleResendEmail}
                  disabled={!canResend || isPending}
                  className={cn(
                    "flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                    canResend && !isPending
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "cursor-not-allowed bg-gray-200 text-gray-500",
                  )}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : canResend ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Resend Verification Email
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Resend in {countdown}s
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Next Steps */}
            <div className="mb-8">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                What happens next?
              </h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                    1
                  </div>
                  <p className="text-sm text-gray-700">
                    <strong>Verify your email:</strong> Click the link in the
                    verification email we sent you.
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                    2
                  </div>
                  <p className="text-sm text-gray-700">
                    <strong>Complete payment:</strong> Select and pay for your
                    membership plan.
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                    3
                  </div>
                  <p className="text-sm text-gray-700">
                    <strong>Biometric setup:</strong> Visit our hub to complete
                    your biometric registration.
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                    4
                  </div>
                  <p className="text-sm text-gray-700">
                    <strong>Start working:</strong> Check in and enjoy our
                    coworking space!
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleGoToLogin}
                className={cn(
                  "flex w-full items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-white font-medium",
                  "transition-colors hover:bg-blue-700",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                )}
              >
                Go to Login
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>

              <Link
                href="/"
                className={cn(
                  "flex w-full items-center justify-center rounded-lg border-2 border-gray-300 px-6 py-3 font-medium text-gray-700",
                  "transition-colors hover:bg-gray-50",
                  "focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2",
                )}
              >
                Back to Home
              </Link>
            </div>

            {/* Help Section */}
            <div className="mt-8 border-t border-gray-200 pt-6 text-center">
              <p className="text-sm text-gray-600">
                Need help?{" "}
                <Link
                  href="/contact"
                  className="font-medium text-blue-600 hover:underline"
                >
                  Contact our support team
                </Link>
              </p>
            </div>
          </div>

          {/* Additional Info Card */}
          <div className="mt-6 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 p-6">
            <h3 className="mb-3 text-lg font-semibold text-gray-900">
              Why verify your email?
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                <span>Ensures secure access to your account</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                <span>Receive important notifications and updates</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                <span>Recover your account if you forget your password</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                <span>Complete your membership setup</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
