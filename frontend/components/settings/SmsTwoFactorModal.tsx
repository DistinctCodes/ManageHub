"use client";

/**
 * SmsTwoFactorModal
 *
 * Step-by-step modal for enabling or disabling SMS 2FA.
 *
 * Enable flow:
 *   Step 1 — Enter phone number + country code
 *   Step 2 — Enter 6-digit OTP
 *   Step 3 — Success confirmation
 *
 * Disable flow:
 *   Single step — confirm with current password
 *
 * Location: frontend/components/settings/SmsTwoFactorModal.tsx
 */

import { useState } from "react";
import {
  useEnableSmsTwoFactor,
  useVerifySmsTwoFactor,
  useDisableSmsTwoFactor,
} from "@/lib/react-query/hooks/admin/sms-2fa";

interface Props {
  isOpen: boolean;
  mode: "enable" | "disable";
  onClose: () => void;
}

export function SmsTwoFactorModal({ isOpen, mode, onClose }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const enable = useEnableSmsTwoFactor();
  const verifySetup = useVerifySmsTwoFactor();
  const disable = useDisableSmsTwoFactor();

  if (!isOpen) return null;

  function reset() {
    setStep(1);
    setPhone("");
    setOtp("");
    setPassword("");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  // ── Enable: Step 1 — phone number ────────────────────────────────────────

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await enable.mutateAsync({ phone });
      setStep(2);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to send code. Try again.");
    }
  }

  // ── Enable: Step 2 — OTP ──────────────────────────────────────────────────

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await verifySetup.mutateAsync({ otp });
      setStep(3);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Invalid or expired code.");
    }
  }

  // ── Disable — password confirmation ───────────────────────────────────────

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await disable.mutateAsync({ currentPassword: password });
      handleClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Incorrect password.");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {mode === "enable"
                ? "Enable SMS Two-Factor Authentication"
                : "Disable SMS Two-Factor Authentication"}
            </h2>
            {mode === "enable" && (
              <p className="mt-1 text-sm text-gray-500">
                Step {step} of 3
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── Enable flow ── */}
        {mode === "enable" && (
          <>
            {step === 1 && (
              <form onSubmit={handleSendCode} className="space-y-4">
                <p className="text-sm text-gray-600">
                  Enter your phone number. We&apos;ll send a 6-digit verification code.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone number (include country code)
                  </label>
                  <input
                    type="tel"
                    placeholder="+2348012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={enable.isPending}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {enable.isPending ? "Sending…" : "Send Code"}
                  </button>
                </div>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <p className="text-sm text-gray-600">
                  Enter the 6-digit code sent to <strong>{phone}</strong>.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Verification code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={verifySetup.isPending || otp.length < 6}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {verifySetup.isPending ? "Verifying…" : "Verify"}
                  </button>
                </div>
              </form>
            )}

            {step === 3 && (
              <div className="text-center space-y-4">
                <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-2xl">
                  ✓
                </div>
                <p className="text-sm text-gray-700">
                  SMS two-factor authentication has been enabled for{" "}
                  <strong>{phone}</strong>.
                </p>
                <button
                  onClick={handleClose}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Disable flow ── */}
        {mode === "disable" && (
          <form onSubmit={handleDisable} className="space-y-4">
            <p className="text-sm text-gray-600">
              Confirm your current password to disable SMS two-factor authentication.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={disable.isPending}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm text-white font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {disable.isPending ? "Disabling…" : "Disable SMS 2FA"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}