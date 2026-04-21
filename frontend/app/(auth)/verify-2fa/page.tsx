"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { useAuthStore } from "@/lib/store/authStore";
import { storage } from "@/lib/storage";
import { Shield, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

function Verify2FAForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tempToken = searchParams.get("tempToken") ?? "";
  const email = searchParams.get("email") ?? "";

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

      apiClient.setToken(response.accessToken);
      useAuthStore.getState().setUser(response.user);
      useAuthStore.getState().setToken(response.accessToken);
      storage.setToken(response.accessToken);
      storage.setUser(response.user);

      if (mode === "backup" && response.backupCodesRemaining !== undefined) {
        toast.success(
          `Signed in. ${response.backupCodesRemaining} backup codes remaining.`
        );
      } else {
        toast.success("Signed in successfully");
      }

      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Invalid code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
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
            {mode === "totp"
              ? "Enter the 6-digit code from your authenticator app."
              : "Enter one of your saved backup codes."}
          </p>
          {email && (
            <p className="mt-1 text-sm text-gray-400">
              Signing in as{" "}
              <span className="font-medium text-gray-700">{email}</span>
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                {mode === "totp" ? "Authentication code" : "Backup code"}
              </label>
              <input
                type={mode === "totp" ? "text" : "text"}
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
          </form>

          <div className="mt-6 text-center">
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

          <div className="mt-4 text-center">
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
