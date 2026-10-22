"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button, inputClass } from "@/components/app-ui";
import { changePassword, logoutEverywhere } from "@/lib/auth-api";
import { useSessionBootstrap } from "@/lib/stores/use-session-bootstrap";
import { useSessionStore } from "@/lib/stores/session-store";

export function AccountSettings() {
  useSessionBootstrap();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useSessionStore((state) => state.user);
  const status = useSessionStore((state) => state.status);
  const setSession = useSessionStore((state) => state.setSession);
  const clearSession = useSessionStore((state) => state.clearSession);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const result = await changePassword(currentPassword, newPassword);
      setSession(result.user, result.accessToken);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password changed. Other sessions have been signed out.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to change password.");
    } finally {
      setBusy(false);
    }
  }

  async function signOutEverywhere() {
    setBusy(true);
    setError(null);
    try {
      await logoutEverywhere();
      queryClient.clear();
      clearSession();
      router.replace("/login");
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Unable to sign out everywhere.");
    } finally {
      setBusy(false);
    }
  }

  if (status !== "authenticated" || !user) {
    return <p className="py-10 text-sm text-gray-500" role="status">Loading account...</p>;
  }

  return (
    <div className="max-w-2xl space-y-8">
      <section className="border-b border-gray-200 pb-7 dark:border-gray-800">
        <h2 className="text-base font-semibold">Profile</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Email</dt>
            <dd className="mt-1 break-all text-sm">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Role</dt>
            <dd className="mt-1 text-sm capitalize">{user.role === "user" ? "Member" : user.role}</dd>
          </div>
        </dl>
      </section>

      <section className="border-b border-gray-200 pb-8 dark:border-gray-800">
        <h2 className="text-base font-semibold">Change password</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Use at least 8 characters and avoid common passwords.</p>
        <form onSubmit={submitPassword} className="mt-5 max-w-md space-y-4">
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          {message && <p className="text-sm text-emerald-700" role="status">{message}</p>}
          <label className="block text-sm font-medium">
            Current password
            <input className={`${inputClass} mt-1`} type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
          </label>
          <label className="block text-sm font-medium">
            New password
            <input className={`${inputClass} mt-1`} type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
          </label>
          <label className="block text-sm font-medium">
            Confirm new password
            <input className={`${inputClass} mt-1`} type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          </label>
          <Button type="submit" disabled={busy}>{busy ? "Saving..." : "Update password"}</Button>
        </form>
      </section>

      <section>
        <h2 className="text-base font-semibold">Sessions</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Sign out this account on every device, including this one.</p>
        <Button type="button" disabled={busy} onClick={signOutEverywhere} className="mt-4 bg-red-700 hover:bg-red-800 focus:ring-red-500/40">
          Sign out everywhere
        </Button>
      </section>
    </div>
  );
}