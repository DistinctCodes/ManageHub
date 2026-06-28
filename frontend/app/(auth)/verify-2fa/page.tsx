"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { useAuthStore } from "@/lib/store/authStore";
import { storage } from "@/lib/storage";
import { Shield, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

// ── Shared helper: apply sign-in side-effects ────────────────────────────────

function applyAuthResponse(response: {
  user: any;
  accessToken: string;
  backupCodesRemaining?: number;
}) {
  apiClient.setToken(response.accessToken);
  useAuthStore.getState().setUser(response.user);
  useAuthStore.getState().setToken(response.accessToken);
  storage.setToken(response.accessToken);
  storage.setUser(response.user);
}

// ── TOTP / Backup panel (original logic, unchanged) ──────────────────────────

function TotpBackupPanel({
  tempToken,
  onSuccess,
}: {
  tempToken: string;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<"totp" | "backup">("totp");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsSubmitting(true);
    try {
      const endpoint =
        mode === "totp" ? "/auth/2fa/verify" : "/auth/2fa/backup-code";

      const body =
        mode === "totp"
          ? { token: code.trim(), tempToken }
          : { backupCode: code.trim(), tempToken };

      const response = await apiClient.post<{
        user: any;
        accessToken: string;
        backupCodesRemaining?: number;
      }>(endpoint, body);

      applyAuthResponse(response);

      if (mode === "backup" && response.backupCodesRemaining !== undefined) {
        toast.success(
          `Signed in. ${response.backupCodesRemaining} backup codes remaining.`
        );
      } else {
        toast.success("Signed in successfully");
      }

      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Invalid code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          {mode === "totp" ? "Authentication code" : "Backup code"}
        </label>
        <input
          type="text"
          inputMode={mode === "totp" ? "numeric" : "text"}
          maxLength={mode === "totp" ? 6 : 20}
          value={code}
          onChange={(e) =>
            setCode(
              mode === "totp"
                ? e.target.value.replace(/\D/g, "")
                : e.target.value
            )
          }
          placeholder={mode === "totp" ? "000000" : "e.g. a1b2c3d4e5"}
          autoFocus
          className={`w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 text-center font-mono text-lg tracking-widest ${
            mode === "backup" ? "tracking-normal text-base" : ""
          }`}
        />
      </div>

      <button
        type="submit"
        disabled={
          isSubmitting ||
          (mode === "totp" ? code.length !== 6 : code.trim().length < 6)
        }
        className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Verifying...
          </>
        ) : (
          "Verify & sign in"
        )}
      </button>

      <div className="text-center">
        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === "totp" ? "backup" : "totp"));
            setCode("");
          }}
          className="text-sm text-gray-500 hover:text-gray-900 underline transition-colors"
        >
          {mode === "totp"
            ? "Use a backup code instead"
            : "Use authenticator app instead"}
        </button>
      </div>
    </form>
  );
}

// ── SMS panel (FE-34) ─────────────────────────────────────────────────────────

function SmsPanel({
  userId,
  tempToken,
  onSuccess,
}: {
  userId: string;
  tempToken: string;
  onSuccess: () => void;
}) {
  const [smsSent, setSmsSent] = useState(false);
  const [code, setCode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  async function handleSendCode() {
    setIsSending(true);
    try {
      await apiClient.post("/auth/2fa/sms/send-code", { userId });
      setSmsSent(true);
      toast.success("Code sent to your phone.");
    } catch (err: any) {
      toast.error(err.message || "Failed to send code. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setIsVerifying(true);
    try {
      const response = await apiClient.post<{ user: any; accessToken: string }>(
        "/auth/2fa/sms/verify",
        { userId, otp: code, tempToken }
      );
      applyAuthResponse(response);
      toast.success("Signed in successfully");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Invalid or expired code.");
    } finally {
      setIsVerifying(false);
    }
  }

  if (!smsSent) {
    return (
      <div className="space-y-5">
        <p className="text-sm text-gray-600">
          Click below to receive a 6-digit code on your registered phone number.
        </p>
        <button
          type="button"
          onClick={handleSendCode}
          disabled={isSending}
          className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isSending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Sending...
            </>
          ) : (
            "Send Code"
          )}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleVerify} className="space-y-5">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          SMS code
        </label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="000000"
          autoFocus
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 text-center font-mono text-lg tracking-widest"
        />
      </div>

      <button
        type="submit"
        disabled={isVerifying || code.length !== 6}
        className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isVerifying ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Verifying...
          </>
        ) : (
          "Verify & sign in"
        )}
      </button>

      <div className="text-center">
        <button
          type="button"
          onClick={() => { setSmsSent(false); setCode(""); }}
          className="text-sm text-gray-500 hover:text-gray-900 underline transition-colors"
        >
          Resend code
        </button>
      </div>
    </form>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

function Verify2FAForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tempToken = searchParams.get("tempToken") ?? "";
  const email     = searchParams.get("email") ?? "";
  const userId    = searchParams.get("userId") ?? "";
  // hasSms is set by the login response when smsTwoFactorEnabled === true
  // so users without SMS 2FA never see the tab
  const hasSms    = searchParams.get("hasSms") === "true";

  const [activeTab, setActiveTab] = useState<"totp" | "sms">("totp");

  return (
    <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-gray-100 p-4 rounded-full">
              <Shield className="h-10 w-10 text-gray-700" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Two-factor verification
          </h2>
          <p className="mt-2 text-gray-600">
            {activeTab === "totp"
              ? "Enter the 6-digit code from your authenticator app."
              : "Verify your identity with an SMS code."}
          </p>
          {email && (
            <p className="mt-1 text-sm text-gray-400">
              Signing in as{" "}
              <span className="font-medium text-gray-700">{email}</span>
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {/* Tab switcher — only visible when this user has SMS 2FA enabled */}
          {hasSms && (
            <div className="flex rounded-lg border border-gray-200 mb-6 overflow-hidden text-sm">
              <button
                type="button"
                onClick={() => setActiveTab("totp")}
                className={`flex-1 py-2 font-medium transition-colors ${
                  activeTab === "totp"
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                Authenticator App
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("sms")}
                className={`flex-1 py-2 font-medium transition-colors ${
                  activeTab === "sms"
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                SMS Code
              </button>
            </div>
          )}

          {activeTab === "totp" ? (
            <TotpBackupPanel
              tempToken={tempToken}
              onSuccess={() => router.push("/dashboard")}
            />
          ) : (
            <SmsPanel
              userId={userId}
              tempToken={tempToken}
              onSuccess={() => router.push("/dashboard")}
            />
          )}

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400">
          &copy; 2026 ManageHub. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function Verify2FAPage() {
  return (
    <Suspense>
      <Verify2FAForm />
    </Suspense>
  );
}