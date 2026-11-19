"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { login, register, AuthApiError } from "@/lib/auth-api";
import { defaultLandingRoute, getSafeReturnTo } from "@/lib/auth-redirect";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  passwordByteLength,
  passwordStrength,
} from "@/lib/password-policy";
import { useSessionStore } from "@/lib/stores/session-store";

export { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/password-policy";

type Mode = "login" | "register";

const STRENGTH_TONES = [
  "bg-red-500",
  "bg-orange-500",
  "bg-yellow-500",
  "bg-lime-500",
  "bg-green-500",
] as const;

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useSessionStore((state) => state.setSession);
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
  const passwordBytes = passwordByteLength(password);
  const strength = passwordStrength(password);
  const passwordDescribedBy = [
    fieldErrors?.password ? "password-error" : null,
    !isLogin ? "password-hint" : null,
  ]
    .filter(Boolean)
    .join(" ");

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

    if (!isLogin) {
      if (passwordBytes < PASSWORD_MIN_LENGTH) {
        setFieldErrors({
          password: `Password must be at least ${PASSWORD_MIN_LENGTH} bytes long.`,
        });
        document.getElementById("password")?.focus();
        return;
      }
      if (passwordBytes > PASSWORD_MAX_LENGTH) {
        setFieldErrors({
          password: `Password must be at most ${PASSWORD_MAX_LENGTH} bytes (hashing only uses the first ${PASSWORD_MAX_LENGTH} bytes).`,
        });
        document.getElementById("password")?.focus();
        return;
      }
    }

    setSubmitting(true);
    try {
      const result = isLogin
        ? await login(email.trim(), password)
        : await register(email.trim(), password);
      // The backend already set its HttpOnly cookie for this response; the
      // token surname in the body is kept in memory only (session-store).
      setSession(result.user, result.accessToken);
      const returnTo = getSafeReturnTo(
        searchParams.get("returnTo") ?? searchParams.get("next"),
        defaultLandingRoute(result.user.role),
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

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
            minLength={isLogin ? 1 : PASSWORD_MIN_LENGTH}
            autoComplete={isLogin ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setConfirmationError(false);
              clearFieldError("password");
            }}
            aria-invalid={fieldErrors?.password ? true : undefined}
            aria-describedby={passwordDescribedBy || undefined}
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
          {!isLogin && (
            <div id="password-hint" className="mt-2 space-y-1">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Use at least {PASSWORD_MIN_LENGTH} bytes and at most{" "}
                {PASSWORD_MAX_LENGTH} bytes. Anything past the first{" "}
                {PASSWORD_MAX_LENGTH} bytes is ignored by the hash, so longer
                passwords would collide with shorter ones.
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {passwordBytes} / {PASSWORD_MAX_LENGTH} bytes
              </p>
              <div
                role="progressbar"
                aria-label="Password strength"
                aria-valuemin={0}
                aria-valuemax={4}
                aria-valuenow={strength.score}
                className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700"
              >
                <div
                  className={`h-1.5 rounded-full ${STRENGTH_TONES[strength.score]}`}
                  style={{ width: `${(strength.score / 4) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Strength: {strength.label}
              </p>
            </div>
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
              minLength={PASSWORD_MIN_LENGTH}
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
