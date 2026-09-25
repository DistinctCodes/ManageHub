"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { login, register } from "@/lib/auth-api";
import { useSessionStore } from "@/lib/stores/session-store";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAccessToken = useSessionStore((state) => state.setAccessToken);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmationError, setConfirmationError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isLogin = mode === "login";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!isLogin && password !== confirmPassword) {
      setConfirmationError(true);
      return;
    }
    setConfirmationError(false);
    setSubmitting(true);
    try {
      const result = isLogin
        ? await login(email.trim(), password)
        : await register(email.trim(), password);
      setAccessToken(result.accessToken);
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/") ? next : "/wallet");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold mb-6">
        {isLogin ? "Sign in" : "Create your account"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={isLogin ? 1 : 8}
            autoComplete={isLogin ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setConfirmationError(false);
            }}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
          />
        </div>

        {!isLogin && (
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setConfirmationError(false);
              }}
              aria-invalid={confirmationError}
              aria-describedby={
                confirmationError ? "confirm-password-error" : undefined
              }
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
            />
            {confirmationError && (
              <p
                id="confirm-password-error"
                className="mt-1 text-sm text-red-600 dark:text-red-400"
                role="alert"
              >
                Passwords do not match.
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-gray-900 text-white dark:bg-white dark:text-gray-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {submitting ? (isLogin ? "Signing in..." : "Creating account...") : isLogin ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
        {isLogin ? (
          <>
            Don&apos;t have an account?{" "}
            <Link href="/register" className="underline">
              Create one
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
