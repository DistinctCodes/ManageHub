// frontend/src/app/auth/forgot-password/success/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Mail,
  Loader2,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { useForgotPassword } from "@/hooks/use-forgot-password";
import { cn } from "@/lib/utils";

function ForgotPasswordSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const { mutate: forgotPassword, isPending } = useForgotPassword();

  // Redirect if no email
  useEffect(() => {
    if (!email) {
      router.push("/auth/forgot-password");
    }
  }, [email, router]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleResendEmail = () => {
    if (email && canResend) {
      forgotPassword(
        { email },
        {
          onSuccess: () => {
            setCountdown(60);
            setCanResend(false);
          },
        },
      );
    }
  };

  if (!email) {
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
            href="/auth/login"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to login
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
                Check Your Email
              </h1>
              <p className="mb-8 text-lg text-gray-600">
                We've sent password reset instructions to your email.
              </p>
            </div>

            {/* Email Notice */}
            <div className="mb-8 rounded-lg border-2 border-blue-200 bg-blue-50 p-6">
              <div className="mb-4 flex items-start">
                <Mail className="mr-3 mt-1 h-6 w-6 flex-shrink-0 text-blue-600" />
                <div>
                  <h2 className="mb-2 text-lg font-semibold text-gray-900">
                    Reset Email Sent
                  </h2>
                  <p className="mb-3 text-sm text-gray-700">
                    We've sent a password reset link to:
                  </p>
                  <p className="mb-4 text-base font-medium text-blue-600">
                    {email}
                  </p>
                  <p className="text-sm text-gray-700">
                    Please check your inbox and click the reset link. The link
                    will expire in <strong>1 hour</strong> for security.
                  </p>
                </div>
              </div>

              {/* Resend Email Button */}
              <div className="mt-4 border-t border-blue-200 pt-4">
                <p className="mb-3 text-sm text-gray-600">
                  Didn't receive the email? Check your spam folder or resend the
                  reset link.
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
                      Resend Reset Email
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
                What to do next:
              </h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                    1
                  </div>
                  <p className="text-sm text-gray-700">
                    <strong>Check your email:</strong> Look for an email from
                    ManageHub with the subject "Reset Your Password".
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                    2
                  </div>
                  <p className="text-sm text-gray-700">
                    <strong>Click the reset link:</strong> This will take you to
                    a secure page where you can create a new password.
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                    3
                  </div>
                  <p className="text-sm text-gray-700">
                    <strong>Create a new password:</strong> Choose a strong
                    password that you haven't used before.
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                    4
                  </div>
                  <p className="text-sm text-gray-700">
                    <strong>Sign in:</strong> Use your new password to access
                    your account.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <Link
              href="/auth/login"
              className={cn(
                "flex w-full items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-white font-medium",
                "transition-colors hover:bg-blue-700",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
              )}
            >
              Back to Login
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>

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

          {/* Security Tips Card */}
          <div className="mt-6 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 p-6">
            <h3 className="mb-3 text-lg font-semibold text-gray-900">
              🔒 Security Tips
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                <span>Never share your password reset link with anyone</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                <span>Make sure the reset link is from managehub.com</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                <span>
                  Use a strong, unique password you haven't used elsewhere
                </span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                <span>
                  If you didn't request this reset, contact support immediately
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <ForgotPasswordSuccessContent />
    </Suspense>
  );
}
