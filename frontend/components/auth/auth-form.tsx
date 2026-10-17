"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { login, register, AuthApiError } from "@/lib/auth-api";
import { getSafeReturnTo } from "@/lib/auth-redirect";
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
  // Per-field validation errors from the API (issue #1988): keys are
  // "email" / "password", values are backend messages for that field.
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string> | null
  >(null);
  const [confirmationError, setConfirmationError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isLogin = mode === "login";

  function clearFieldError(field: string) {
    setFieldErrors((prev) => {
      if (!prev || !(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors(null);
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
      const returnTo = getSafeReturnTo(
        searchParams.get("returnTo") ?? searchParams.get("next"),
      );
      router.push(returnTo);
    } catch (err) {
      // Rate limiting (#1988): show a single, calm form-level message and
      // make it clear the problem is not a specific field.
      if (err instanceof AuthApiError && err.status === 429) {
        setFieldErrors(null);
        setError("Too many attempts. Please wait a few minutes and try again.");
        return;
      }

      const fieldErrors =
        err instanceof AuthApiError ? { ...err.fieldErrors } : {};
      const firstInvalidField = Object.entries(fieldErrors)[0];

      if (firstInvalidField) {
        // Render each message next to its field, announce them to screen
        // readers (aria-live via role="alert") and focus the first invalid
        // input so keyboard users land straight on what to fix.
        setFieldErrors(fieldErrors);
        setError(null);
        document.getElementById(firstInvalidField[0])?.focus();
      } else {
        setFieldErrors(null);
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
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
            onChange={(e) => {
              setEmail(e.target.value);
              clearFieldError("email");
            }}
            aria-invalid={
              fieldErrors?.email ? true : undefined
            }
            aria-describedby={fieldErrors?.email ? "email-error" : undefined}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
          />
          {fieldErrors?.email && (
            <p
              id="email-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {fieldErrors.email}
            </p>
          )}
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
              clearFieldError("password");
            }}
            aria-invalid={fieldErrors?.password ? true : undefined}
            aria-describedby={
              fieldErrors?.password ? "password-error" : undefined
            }
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
          />
          {fieldErrors?.password && (
            <p
              id="password-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {fieldErrors.password}
            </p>
          )}
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
