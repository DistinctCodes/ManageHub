"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/lib/auth-api";
import { Button, inputClass } from "@/components/app-ui";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!token) {
      setError("This reset link is missing its token. Request a new link.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await resetPassword(token, password);
      router.replace("/login?passwordReset=1");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to reset password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold">Choose a new password</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        <label className="block text-sm font-medium">
          New password
          <input className={`${inputClass} mt-1`} type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Confirm new password
          <input className={`${inputClass} mt-1`} type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
        </label>
        <Button type="submit" disabled={busy}>{busy ? "Updating..." : "Reset password"}</Button>
      </form>
      <Link className="mt-6 inline-block text-sm text-blue-700 underline dark:text-blue-400" href="/forgot-password">Request another link</Link>
    </main>
  );
}