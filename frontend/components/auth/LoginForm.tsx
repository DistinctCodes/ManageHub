"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin } from "@/hooks/use-login";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().default(false),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const { login, loading } = useLogin();
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold">Welcome back</h1>
      <p className="text-sm text-gray-600 mt-1">
        Login to continue to your account
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            placeholder="you@email.com"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
            {...register("email")}
          />
          {errors.email?.message && (
            <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>

          <div className="flex items-center gap-2">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
              {...register("password")}
            />

            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {errors.password?.message && (
            <p className="text-xs text-red-600 mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Remember me + Forgot password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4"
              {...register("rememberMe")}
            />
            Remember me
          </label>

          <Link
            href="/auth/forgot-password"
            className="text-sm font-medium hover:underline"
          >
            Forgot Password?
          </Link>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-black text-white py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {/* Register */}
      <p className="text-sm text-gray-600 mt-5 text-center">
        Don’t have an account?{" "}
        <Link href="/auth/register" className="font-medium hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}
