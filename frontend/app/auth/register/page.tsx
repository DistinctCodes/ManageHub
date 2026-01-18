// frontend/src/app/auth/register/page.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import {
  RegisterFormData,
  RegisterPayload,
  registerSchema,
} from "@/schemas/auth.schema";
import { useRegister } from "@/hooks/use-register";
import { MembershipTypeCard } from "@/components/auth/membership-type-card";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { mutate: register, isPending } = useRegister();

  const {
    register: registerField,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      membershipType: "hot-desk",
    },
  });

  const selectedMembership = watch("membershipType");

  const onSubmit = (data: RegisterFormData) => {
    // Properly extract only the fields needed for the API
    const payload: RegisterPayload = {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      password: data.password,
      membershipType: data.membershipType,
    };
    register(payload);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to home
          </Link>
        </div>

        {/* Main Content */}
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Create your ManageHub account
            </h1>
            <p className="mt-2 text-gray-600">
              Join the premier's coworking community
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Personal Information */}
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-xl font-semibold text-gray-900">
                Personal Information
              </h2>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Full Name */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="fullName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...registerField("fullName")}
                    type="text"
                    id="fullName"
                    placeholder="John Doe"
                    className={cn(
                      "mt-1 block w-full rounded-lg border px-4 py-2.5 text-gray-900 transition-colors",
                      "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                      errors.fullName ? "border-red-500" : "border-gray-300",
                    )}
                    disabled={isPending}
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.fullName.message}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...registerField("email")}
                    type="email"
                    id="email"
                    placeholder="john@example.com"
                    className={cn(
                      "mt-1 block w-full rounded-lg border px-4 py-2.5 text-gray-900 transition-colors",
                      "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                      errors.email ? "border-red-500" : "border-gray-300",
                    )}
                    disabled={isPending}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...registerField("phone")}
                    type="tel"
                    id="phone"
                    placeholder="08012345678"
                    className={cn(
                      "mt-1 block w-full rounded-lg border px-4 py-2.5 text-gray-900 transition-colors",
                      "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                      errors.phone ? "border-red-500" : "border-gray-300",
                    )}
                    disabled={isPending}
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1">
                    <input
                      {...registerField("password")}
                      type={showPassword ? "text" : "password"}
                      id="password"
                      placeholder="••••••••"
                      className={cn(
                        "block w-full rounded-lg border px-4 py-2.5 pr-10 text-gray-900 transition-colors",
                        "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                        errors.password ? "border-red-500" : "border-gray-300",
                      )}
                      disabled={isPending}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
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
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1">
                    <input
                      {...registerField("confirmPassword")}
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      placeholder="••••••••"
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
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
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
              </div>
            </div>

            {/* Membership Type Selection */}
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-xl font-semibold text-gray-900">
                Choose Your Membership <span className="text-red-500">*</span>
              </h2>

              <div className="grid gap-6 md:grid-cols-3">
                <MembershipTypeCard
                  type="hot-desk"
                  selected={selectedMembership === "hot-desk"}
                  onSelect={() => setValue("membershipType", "hot-desk")}
                />
                <MembershipTypeCard
                  type="dedicated"
                  selected={selectedMembership === "dedicated"}
                  onSelect={() => setValue("membershipType", "dedicated")}
                />
                <MembershipTypeCard
                  type="private-office"
                  selected={selectedMembership === "private-office"}
                  onSelect={() => setValue("membershipType", "private-office")}
                />
              </div>

              {errors.membershipType && (
                <p className="mt-4 text-sm text-red-600">
                  {errors.membershipType.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex flex-col items-center gap-4">
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
                    Creating account...
                  </span>
                ) : (
                  "Create Account"
                )}
              </button>

              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link
                  href="/auth/login"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
