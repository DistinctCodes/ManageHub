"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, CheckCircle, Clock, Mail, Send } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { forgotPasswordSchema, type ForgotPasswordForm } from "@/lib/schemas/auth";
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
      }
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
    <div className="max-w-md w-full space-y-8 p-4 sm:p-0">
      <div className="text-center space-y-2">
        {!isSubmitted ? (
          <>
            <h2 className="text-3xl font-bold text-gray-900">
              Forgot Password?
            </h2>
            <p className="text-gray-600">
              Enter your email and we'll send you a link to reset your password.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-3xl font-bold text-gray-900">Check Your Email</h2>
            <p className="text-gray-600">
              We've sent password reset instructions to your email address.
            </p>
          </>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-8">
        {!isSubmitted ? (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                disabled={isPending}
                icon={<Mail className="h-5 w-5" />}
                error={form.formState.errors.email?.message}
                {...form.register("email")}
              />

              {serverError && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {serverError}
                </p>
              )}
            </div>

            <Button
              type="submit"
              loading={isPending}
              disabled={isPending}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white"
              icon={<Send />}
            >
              Send Reset Link
            </Button>

            <Link
              href="/login"
              className="flex items-center justify-center text-blue-600 hover:text-blue-700 font-medium transition-colors text-sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sign In
            </Link>
          </form>
        ) : (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="bg-blue-50 p-4 rounded-full">
                <CheckCircle className="h-12 w-12 text-blue-600" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-gray-600">We've sent instructions to</p>
              <p className="font-semibold text-gray-900 text-lg my-2">{submittedEmail}</p>
              <p className="text-gray-500 text-sm">
                The email contains a link to reset your password. If you don't see it, please check your spam folder.
              </p>
            </div>

            {serverError && (
              <p className="text-sm text-red-600 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {serverError}
              </p>
            )}

            <Button
              type="button"
              onClick={onResend}
              loading={isPending}
              disabled={isPending || cooldown > 0}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white"
              icon={<Clock />}
            >
              {cooldown > 0 ? `Retry in ${cooldown}s` : "Resend Email"}
            </Button>

            <Link
              href="/login"
              className="flex items-center justify-center text-blue-600 hover:text-blue-700 font-medium transition-colors text-sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
