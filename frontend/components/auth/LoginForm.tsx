"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin } from "@/hooks/use-login";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Fingerprint,
  Scan,
  Building2,
} from "lucide-react";

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onEmailLogin: (data: {
    email: string;
    password: string;
    rememberMe?: boolean;
  }) => void;
  onBiometricScan: () => void;
  isLoading: boolean;
}

export default function LoginForm({
  onEmailLogin,
  onBiometricScan,
  isLoading,
}: LoginFormProps) {
  const { login, loading } = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"email" | "biometric">(
    "email",
  );
  const handleBiometricLogin = () => {
    // Handle biometric authentication
    console.log("Biometric login initiated");
  };

  const defaultValues = useMemo<LoginFormValues>(
    () => ({
      email: "",
      password: "",
      rememberMe: false,
    }),
    [],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues,
    mode: "onSubmit",
  });

  const onSubmit = (values: LoginFormValues) => login(values);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
          <p className="mt-2 text-gray-600">Sign in to your workspace</p>
        </div>

        {/* Login Method Toggle */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 flex">
          <button
            type="button"
            onClick={() => setLoginMethod("email")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              loginMethod === "email"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Mail className="h-4 w-4 inline mr-2" />
            Email Login
          </button>
          <button
            type="button"
            onClick={() => setLoginMethod("biometric")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              loginMethod === "biometric"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Fingerprint className="h-4 w-4 inline mr-2" />
            Biometric
          </button>
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
        >
          {loginMethod === "email" ? (
            <div className="space-y-6">
              {/* Email Input */}
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
                    type="email"
                    {...register("email")}
                    required
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    placeholder="Enter your email"
                  />
                  {errors.email?.message && (
                    <p className="text-xs text-red-600 mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    required
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    placeholder="Enter your password"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                  {errors.password?.message && (
                    <p className="text-xs text-red-600 mt-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    {...register("rememberMe")}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 block text-sm text-gray-700"
                  >
                    Remember me
                  </label>
                </div>
                <Link
                  href="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </div>
          ) : (
            /* Biometric Login Interface */
            <div className="text-center space-y-6">
              <div className="bg-slate-50 rounded-xl p-8">
                <div className="flex justify-center mb-4">
                  <div className="bg-teal-100 p-4 rounded-full">
                    <Scan className="h-12 w-12 text-teal-600" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Biometric Authentication
                </h3>
                <p className="text-gray-600 mb-6">
                  Place your finger on the scanner or look at the camera to sign
                  in
                </p>
                <button
                  onClick={handleBiometricLogin}
                  className="bg-teal-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors"
                >
                  Start Scan
                </button>
              </div>

              <div className="text-sm text-gray-600">
                <p>
                  Having trouble?
                  <button
                    onClick={() => setLoginMethod("email")}
                    className="text-blue-600 hover:text-blue-500 font-medium ml-1"
                  >
                    Use email login
                  </button>
                </p>
              </div>
            </div>
          )}
        </form>

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
