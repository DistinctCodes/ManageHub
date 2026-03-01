"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthState, useAuthActions } from "@/lib/store/authStore";
import { apiClient } from "@/lib/apiClient";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Eye, EyeOff, Shield, Bell, Palette } from "lucide-react";

/* ── Password change schema ── */
const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

/* ── Toggle row ── */
function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
          checked ? "bg-gray-900" : "bg-gray-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuthState();
  const { logout } = useAuthActions();

  /* ── Password state ── */
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const onPasswordSubmit = async (data: PasswordForm) => {
    if (!user) return;
    setPwSaving(true);
    setPwMsg(null);
    try {
      await apiClient.patch(`/users/${user.id}`, {
        password: data.newPassword,
      });
      setPwMsg({ type: "success", text: "Password updated." });
      reset();
    } catch (err) {
      setPwMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update password.",
      });
    } finally {
      setPwSaving(false);
    }
  };

  /* ── Notification preferences (local only for now) ── */
  const [emailNotif, setEmailNotif] = useState(true);
  const [inAppNotif, setInAppNotif] = useState(true);

  /* ── 2FA (stub — backend has the column but no full flow yet) ── */
  const [twoFactor, setTwoFactor] = useState(false);

  /* ── Danger zone ── */
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/users/${user.id}`);
      logout();
      window.location.href = "/";
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Manage your account preferences.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* ── Security ── */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Shield className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">Security</h2>
          </div>

          <form
            onSubmit={handleSubmit(onPasswordSubmit)}
            className="space-y-4"
          >
            {/* Current password */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Current password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  {...register("currentPassword")}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrent ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>

            {/* New password */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                New password
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  {...register("newPassword")}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNew ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.newPassword.message}
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Confirm new password
              </label>
              <input
                type="password"
                {...register("confirmPassword")}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {pwMsg && (
              <p
                className={`text-sm ${
                  pwMsg.type === "success"
                    ? "text-emerald-600"
                    : "text-red-500"
                }`}
              >
                {pwMsg.text}
              </p>
            )}

            <button
              type="submit"
              disabled={pwSaving}
              className="px-5 py-2.5 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {pwSaving ? "Updating..." : "Update password"}
            </button>
          </form>

          {/* 2FA toggle */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <ToggleRow
              label="Two-factor authentication"
              description="Add an extra layer of security to your account (coming soon)"
              checked={twoFactor}
              onChange={setTwoFactor}
            />
          </div>
        </div>

        {/* ── Notifications ── */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">
              Notifications
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            <ToggleRow
              label="Email notifications"
              description="Receive updates and alerts via email"
              checked={emailNotif}
              onChange={setEmailNotif}
            />
            <ToggleRow
              label="In-app notifications"
              description="Show notifications inside the dashboard"
              checked={inAppNotif}
              onChange={setInAppNotif}
            />
          </div>
        </div>

        {/* ── Appearance ── */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">Appearance</h2>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">
              Theme
            </label>
            <div className="flex gap-3">
              {(["Light", "Dark", "System"] as const).map((theme) => (
                <button
                  key={theme}
                  type="button"
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:border-gray-400 transition-colors data-[active=true]:bg-gray-900 data-[active=true]:text-white data-[active=true]:border-gray-900"
                  data-active={theme === "Light"}
                >
                  {theme}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Theme switching coming soon.
            </p>
          </div>
        </div>

        {/* ── Danger zone ── */}
        <div className="bg-white rounded-xl border border-red-100 p-6">
          <h2 className="text-sm font-semibold text-red-600 mb-1">
            Danger zone
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Permanently delete your account and all associated data.
          </p>
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="px-5 py-2.5 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            >
              Delete my account
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="px-5 py-2.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? "Deleting..." : "Yes, delete my account"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
