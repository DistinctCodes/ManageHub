// frontend/src/app/auth/verify-email/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { useVerifyEmail } from "@/hooks/use-verify-email";
import { cn } from "@/lib/utils";

type VerificationStatus =
  | "verifying"
  | "success"
  | "error"
  | "expired"
  | "invalid";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<VerificationStatus>("verifying");
  const [errorMessage, setErrorMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const { mutate: verifyEmail, isPending } = useVerifyEmail();

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      setErrorMessage("No verification token provided");
      return;
    }

    // Trigger verification
    verifyEmail(token, {
      onSuccess: (data) => {
        setStatus("success");
        setUserEmail(data.data.email);

        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/auth/login?verified=true");
        }, 3000);
      },
      onError: (error: any) => {
        const message = error?.response?.data?.message || "Verification failed";
        setErrorMessage(message);

        if (message.includes("expired")) {
          setStatus("expired");
        } else if (message.includes("already verified")) {
          setStatus("success");
          // Still redirect to login
          setTimeout(() => {
            router.push("/auth/login?verified=true");
          }, 3000);
        } else if (
          message.includes("invalid") ||
          message.includes("not found")
        ) {
          setStatus("invalid");
        } else {
          setStatus("error");
        }
      },
    });
  }, [token, verifyEmail, router]);

  // Verifying State
  if (status === "verifying" || isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-md">
            <div className="rounded-2xl bg-white p-8 shadow-lg md:p-12">
              <div className="flex flex-col items-center text-center">
                <div className="mb-6">
                  <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
                </div>
                <h1 className="mb-3 text-2xl font-bold text-gray-900">
                  Verifying Your Email
                </h1>
                <p className="text-gray-600">
                  Please wait while we verify your email address...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success State
  if (status === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-md">
            <div className="rounded-2xl bg-white p-8 shadow-lg md:p-12">
              {/* Success Icon */}
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-green-100 p-4">
                  <CheckCircle2 className="h-16 w-16 text-green-600" />
                </div>
              </div>

              {/* Success Message */}
              <div className="text-center">
                <h1 className="mb-3 text-2xl font-bold text-gray-900">
                  Email Verified Successfully!
                </h1>
                {userEmail && (
                  <p className="mb-2 text-sm text-gray-600">{userEmail}</p>
                )}
                <p className="mb-6 text-gray-600">
                  Your email has been verified. You can now proceed to complete
                  your membership setup.
                </p>

                {/* Next Steps */}
                <div className="mb-6 rounded-lg bg-blue-50 p-4 text-left">
                  <h3 className="mb-3 text-sm font-semibold text-gray-900">
                    Next Steps:
                  </h3>
                  <ol className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start">
                      <span className="mr-2 font-semibold text-blue-600">
                        1.
                      </span>
                      <span>Sign in to your account</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 font-semibold text-blue-600">
                        2.
                      </span>
                      <span>Complete payment for your membership</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 font-semibold text-blue-600">
                        3.
                      </span>
                      <span>Set up biometric authentication at our hub</span>
                    </li>
                  </ol>
                </div>

                {/* Auto-redirect notice */}
                <p className="mb-6 text-sm text-gray-500">
                  Redirecting to login page in 3 seconds...
                </p>

                {/* Action Button */}
                <Link
                  href="/auth/login?verified=true"
                  className={cn(
                    "flex w-full items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-white font-medium",
                    "transition-colors hover:bg-blue-700",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  )}
                >
                  Continue to Login
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Expired Token State
  if (status === "expired") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-md">
            <div className="rounded-2xl bg-white p-8 shadow-lg md:p-12">
              {/* Warning Icon */}
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-yellow-100 p-4">
                  <AlertCircle className="h-16 w-16 text-yellow-600" />
                </div>
              </div>

              {/* Expired Message */}
              <div className="text-center">
                <h1 className="mb-3 text-2xl font-bold text-gray-900">
                  Verification Link Expired
                </h1>
                <p className="mb-6 text-gray-600">
                  This verification link has expired. Verification links are
                  valid for 24 hours for security reasons.
                </p>

                {/* Info Box */}
                <div className="mb-6 rounded-lg bg-yellow-50 p-4 text-left">
                  <p className="text-sm text-gray-700">
                    Don't worry! You can request a new verification email from
                    the registration success page or try signing in.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Link
                    href="/auth/login"
                    className={cn(
                      "flex w-full items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-white font-medium",
                      "transition-colors hover:bg-blue-700",
                      "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                    )}
                  >
                    Go to Login
                  </Link>

                  <Link
                    href="/auth/register"
                    className={cn(
                      "flex w-full items-center justify-center rounded-lg border-2 border-gray-300 px-6 py-3 font-medium text-gray-700",
                      "transition-colors hover:bg-gray-50",
                      "focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2",
                    )}
                  >
                    Register Again
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Invalid Token State
  if (status === "invalid") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-md">
            <div className="rounded-2xl bg-white p-8 shadow-lg md:p-12">
              {/* Error Icon */}
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-red-100 p-4">
                  <XCircle className="h-16 w-16 text-red-600" />
                </div>
              </div>

              {/* Invalid Message */}
              <div className="text-center">
                <h1 className="mb-3 text-2xl font-bold text-gray-900">
                  Invalid Verification Link
                </h1>
                <p className="mb-6 text-gray-600">
                  This verification link is invalid or has already been used.
                </p>

                {/* Info Box */}
                <div className="mb-6 rounded-lg bg-red-50 p-4 text-left">
                  <p className="mb-2 text-sm font-semibold text-gray-900">
                    Possible reasons:
                  </p>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>• The link was copied incorrectly</li>
                    <li>• Your email has already been verified</li>
                    <li>• The link has expired</li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Link
                    href="/auth/login"
                    className={cn(
                      "flex w-full items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-white font-medium",
                      "transition-colors hover:bg-blue-700",
                      "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                    )}
                  >
                    Try Logging In
                  </Link>

                  <Link
                    href="/contact"
                    className={cn(
                      "flex w-full items-center justify-center rounded-lg border-2 border-gray-300 px-6 py-3 font-medium text-gray-700",
                      "transition-colors hover:bg-gray-50",
                      "focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2",
                    )}
                  >
                    Contact Support
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Generic Error State
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-md">
          <div className="rounded-2xl bg-white p-8 shadow-lg md:p-12">
            {/* Error Icon */}
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-red-100 p-4">
                <XCircle className="h-16 w-16 text-red-600" />
              </div>
            </div>

            {/* Error Message */}
            <div className="text-center">
              <h1 className="mb-3 text-2xl font-bold text-gray-900">
                Verification Failed
              </h1>
              <p className="mb-6 text-gray-600">
                {errorMessage ||
                  "An error occurred while verifying your email."}
              </p>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Link
                  href="/auth/register/success"
                  className={cn(
                    "flex w-full items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-white font-medium",
                    "transition-colors hover:bg-blue-700",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  )}
                >
                  Request New Link
                </Link>

                <Link
                  href="/contact"
                  className={cn(
                    "flex w-full items-center justify-center rounded-lg border-2 border-gray-300 px-6 py-3 font-medium text-gray-700",
                    "transition-colors hover:bg-gray-50",
                    "focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2",
                  )}
                >
                  Contact Support
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
