"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Mail,
  Send,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  forgotPasswordSchema,
  type ForgotPasswordForm,
} from "@/lib/schemas/auth";
import { useForgotPassword } from "@/lib/react-query/hooks/auth/useForgotPassword";

export function ForgotPasswordForm() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
    defaultValues: {
      email: "",
    },
  });


  const { mutate, isPending, error, reset } = useForgotPassword();

  const serverError = useMemo(() => {
    if (!error) return null;
    if (error instanceof Error) return error.message;
    return "Something went wrong";
  }, [error]);

  const isSubmitted = submittedEmail !== null;

  useEffect(() => {
    if (cooldown <= 0) return;

    const interval = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldown]);

  const submitEmail = (email: string) => {
    reset();
    mutate(
      { email },
      {
        onSuccess: () => {
          setSubmittedEmail(email);
          setCooldown(60);
        },
      },
    );
  };

  const onSubmit = (data: ForgotPasswordForm) => {
    submitEmail(data.email);
  };

  const onResend = () => {
    if (!submittedEmail) return;
    if (cooldown > 0) return;
    submitEmail(submittedEmail);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          {!isSubmitted ? (
            <>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">
                Forgot Password?
              </h2>
              <p className="mt-2 text-gray-600">
                No worries, we'll send you reset instructions
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">
                Check Your Email
              </h2>
              <p className="mt-2 text-gray-600">
                We've sent password reset instructions to your email
              </p>
            </>
          )}
        </div>

        {/* Main Content Card */}
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
        >
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
                    {...form.register("email")}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                      error ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Enter your email address"
                    disabled={isPending}
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
                disabled={isPending}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isPending ? (
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

              <Link
                href="/login"
                className="flex items-center justify-center text-blue-600 hover:text-blue-500 font-medium transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Link>
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
                  We've sent a password reset link to
                </p>
                <p className="font-medium text-gray-900">{submittedEmail}</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      Didn't receive the email?
                    </p>
                    <p className="text-sm text-blue-700">
                      Check your spam folder or click the resend button below
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={onResend}
                disabled={cooldown > 0 || isPending}
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
                    Resend Email
                  </>
                )}
              </button>

              <a
                href="#"
                className="flex items-center justify-center text-blue-600 hover:text-blue-500 font-medium transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </a>
            </div>
          )}
        </form>

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
                  If you're having trouble accessing your account, contact our
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
        <div className="text-center text-xs text-gray-500">
          <p>© 2025 ManageHub. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <a href="#" className="hover:text-gray-700">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-gray-700">
              Terms of Service
            </a>
            <a href="#" className="hover:text-gray-700">
              Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
