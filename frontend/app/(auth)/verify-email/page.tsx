"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Mail,
  Clock,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { useVerifyEmail } from "@/lib/react-query/hooks/auth/useVerifyEmail";
import { useResendVerification } from "@/lib/react-query/hooks/auth/useResendVerification";
import { storage } from "@/lib/storage";

type VerificationStatus = "idle" | "verifying" | "success" | "error";

const VerifyEmailPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract token and email from URL
  const token = searchParams.get("token");
  const urlEmail = searchParams.get("email");

  // State management
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>("idle");
  const [email, setEmail] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  // Refs for preventing race conditions and managing intervals
  const hasAttemptedVerification = useRef(false);
  const resendIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const redirectIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Hooks
  const {
    mutate: verifyEmail,
    isPending: isVerifying,
    isError,
  } = useVerifyEmail();

  const { mutate: resendVerification, isPending: isResending } =
    useResendVerification();

  // Get email from storage or URL on mount
  useEffect(() => {
    // Priority 1: URL parameter
    if (urlEmail) {
      setEmail(urlEmail);
      return;
    }

    // Priority 2: localStorage
    const user = storage.getUser();
    if (user?.email) {
      setEmail(user.email);
    }
  }, [urlEmail]);

  // Auto-verify on mount if token exists
  useEffect(() => {
    if (hasAttemptedVerification.current) return;

    if (!token) {
      setVerificationStatus("error");
      setErrorMessage(
        "Invalid verification link. Please request a new one."
      );
      hasAttemptedVerification.current = true;
      return;
    }

    hasAttemptedVerification.current = true;
    setVerificationStatus("verifying");

    verifyEmail(token, {
      onSuccess: () => {
        setVerificationStatus("success");
        // Start redirect countdown with proper cleanup
        let countdown = 3;
        redirectIntervalRef.current = setInterval(() => {
          countdown--;
          setRedirectCountdown(countdown);
          if (countdown <= 0) {
            if (redirectIntervalRef.current) {
              clearInterval(redirectIntervalRef.current);
            }
            router.push("/login");
          }
        }, 1000);
      },
      onError: (error: any) => {
        setVerificationStatus("error");
        setErrorMessage(
          error.message ||
            "Verification failed. The link may be invalid or expired."
        );
      },
    });
  }, [token, verifyEmail, router]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (resendIntervalRef.current) {
        clearInterval(resendIntervalRef.current);
      }
      if (redirectIntervalRef.current) {
        clearInterval(redirectIntervalRef.current);
      }
    };
  }, []);

  // Handle resend verification
  const handleResend = () => {
    if (!email) {
      setErrorMessage("Email address not found. Please try logging in.");
      return;
    }

    if (resendCountdown > 0) return;

    resendVerification(email, {
      onSuccess: () => {
        // Start 60-second countdown with proper cleanup
        setResendCountdown(60);

        // Clear any existing interval
        if (resendIntervalRef.current) {
          clearInterval(resendIntervalRef.current);
        }

        resendIntervalRef.current = setInterval(() => {
          setResendCountdown((prev) => {
            if (prev <= 1) {
              if (resendIntervalRef.current) {
                clearInterval(resendIntervalRef.current);
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      },
    });
  };

  // Redirect to login if no email found
  if (!email && verificationStatus !== "verifying") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Email Not Found
            </h1>
            <p className="text-gray-600">
              Unable to retrieve your email address
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 mx-auto text-amber-600 mb-4" />
              <p className="text-gray-700 mb-6">
                Please try logging in to verify your email.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Email Verification
          </h1>
          <p className="text-gray-600">
            {verificationStatus === "verifying" &&
              "We're verifying your email address..."}
            {verificationStatus === "success" &&
              "Your email has been verified!"}
            {verificationStatus === "error" && "Verification encountered an issue"}
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
          {/* Verifying State */}
          {verificationStatus === "verifying" && (
            <div className="text-center py-8">
              <Loader2 className="w-16 h-16 mx-auto text-blue-600 animate-spin mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Verifying Email
              </h2>
              <p className="text-gray-600">Please wait a moment...</p>
            </div>
          )}

          {/* Success State */}
          {verificationStatus === "success" && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2
                  className="w-12 h-12 text-green-600"
                  strokeWidth={2.5}
                />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Email Verified!
              </h2>
              <p className="text-gray-600 mb-4">
                Your email <span className="font-semibold">{email}</span> has
                been successfully verified.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center gap-2 text-blue-900">
                  <Clock className="w-5 h-5" />
                  <p className="text-sm font-medium">
                    Redirecting to login in {redirectCountdown} second
                    {redirectCountdown !== 1 ? "s" : ""}...
                  </p>
                </div>
              </div>

              <Link
                href="/login"
                className="inline-flex items-center justify-center w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Continue to Login
                <span className="ml-2 text-xl">→</span>
              </Link>
            </div>
          )}

          {/* Error State */}
          {verificationStatus === "error" && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-12 h-12 text-red-600" strokeWidth={2.5} />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Verification Failed
              </h2>
              <p className="text-gray-600 mb-6">
                {errorMessage || "The verification link is invalid or has expired."}
              </p>

              {/* Info Alert */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      Need a new verification link?
                    </p>
                    <p className="text-sm text-blue-700">
                      We can send a new verification email to{" "}
                      <span className="font-medium">{email}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Resend Button */}
              <button
                onClick={handleResend}
                disabled={resendCountdown > 0 || isResending}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mb-4"
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : resendCountdown > 0 ? (
                  <>
                    <Clock className="w-5 h-5 mr-2" />
                    Resend in {resendCountdown}s
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5 mr-2" />
                    Resend Verification Email
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">OR</span>
                </div>
              </div>

              {/* Back to Login */}
              <Link
                href="/login"
                className="flex items-center justify-center text-blue-600 hover:text-blue-500 font-medium transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Login
              </Link>
            </div>
          )}
        </div>

        {/* Sign Up Link */}
        <div className="text-center">
          <p className="text-gray-600">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Sign up here
            </Link>
          </p>
        </div>

        {/* Footer */}
        <footer className="text-center text-sm text-gray-600">
          <p className="mb-2">© 2025 ManageHub. All rights reserved.</p>
          <div className="flex justify-center gap-4">
            <Link
              href="/privacy-policy"
              className="hover:text-gray-900 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms-of-service"
              className="hover:text-gray-900 transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/contact"
              className="hover:text-gray-900 transition-colors"
            >
              Support
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
