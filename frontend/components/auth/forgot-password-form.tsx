"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/auth-api";
import { Button, inputClass } from "@/components/app-ui";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to request a reset link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold">Reset your password</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Enter your account email and we will send a reset link if it matches an account.</p>
      {sent ? (
        <p className="mt-6 text-sm text-emerald-700 dark:text-emerald-400" role="status">If an account exists for that email, a reset link has been sent.</p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <label className="block text-sm font-medium">
            Email
            <input className={`${inputClass} mt-1`} type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <Button type="submit" disabled={busy}>{busy ? "Sending..." : "Send reset link"}</Button>
        </form>
      )}
      <Link className="mt-6 inline-block text-sm text-blue-700 underline dark:text-blue-400" href="/login">Back to sign in</Link>
    </main>
  );
}