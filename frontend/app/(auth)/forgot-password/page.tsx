"use client";
import React, { useState } from "react";
import {
  Mail,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Building2,
  Send,
  Clock,
} from "lucide-react";
import Link from "next/link";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = () => {
    setError("");

    if (!email.trim()) {
      setError("Email address is required");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
      setResendTimer(60); // 60 seconds cooldown

      // Start countdown
      const interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      console.log("Password reset email sent to:", email);
    }, 1500);
  };

  const handleResend = () => {
    if (resendTimer === 0) {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          {/* <div className="flex justify-center items-center mb-6">
            <div className="bg-blue-600 p-3 rounded-xl">
              <Building2 className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">ManageHub</h1> */}
          {!isSubmitted ? (
            <>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">
                Forgot Password?
              </h2>
              <p className="mt-2 text-gray-600">
                No worries, we will send you reset instructions
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">
                Check Your Email
              </h2>
              <p className="mt-2 text-gray-600">
                We have sent password reset instructions to your email
              </p>
            </>
          )}
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {!isSubmitted ? (
            /* Email Input Form */
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                      error ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Enter your email address"
                    disabled={isLoading}
                  />
                </div>
                {error && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {error}
                  </p>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Send Reset Link
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

              <a
                href="#"
                className="flex items-center justify-center text-blue-600 hover:text-blue-500 font-medium transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </a>
            </div>
          ) : (
            /* Success State */
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <div className="bg-green-100 p-4 rounded-full">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-gray-700">
                  We have sent a password reset link to
                </p>
                <p className="font-medium text-gray-900">{email}</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      Did not receive the email?
                    </p>
                    <p className="text-sm text-blue-700">
                      Check your spam folder or click the resend button below
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleResend}
                disabled={resendTimer > 0}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {resendTimer > 0 ? (
                  <>
                    <Clock className="h-5 w-5 mr-2" />
                    Resend in {resendTimer}s
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Resend Email
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
        </div>

        {/* Help Section */}
        {!isSubmitted && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-900">
                  Need help?
                </h3>
                <p className="mt-1 text-sm text-blue-700">
                  If you are having trouble accessing your account, contact our
                  support team at{" "}
                  <a
                    href="mailto:support@managehub.com"
                    className="font-medium underline hover:text-blue-600"
                  >
                    support@managehub.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sign Up Link */}
        <div className="text-center">
          <p className="text-gray-600">
            Dont have an account?{" "}
            <Link
              href="/register"
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Sign up here
            </Link>
          </p>
        </div>

        {/* Footer */}
        {/* <div className="text-center text-xs text-gray-500">
          <p>© 2025 ManageHub. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <Link href="#" className="hover:text-gray-700">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-gray-700">
              Terms of Service
            </Link>
            <Link href="#" className="hover:text-gray-700">
              Support
            </Link>
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
