"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Shield, Copy, CheckCircle2, AlertTriangle } from "lucide-react";
import { useSetup2fa } from "@/lib/react-query/hooks/two-factor/useSetup2fa";
import { useConfirm2fa } from "@/lib/react-query/hooks/two-factor/useConfirm2fa";
import { useDisable2fa } from "@/lib/react-query/hooks/two-factor/useDisable2fa";

type Mode = "setup" | "disable";

interface Props {
  mode: Mode;
  onClose: () => void;
}

export default function TwoFactorModal({ mode, onClose }: Props) {
  const setup2fa = useSetup2fa();
  const confirm2fa = useConfirm2fa();
  const disable2fa = useDisable2fa();

  // Setup flow state
  const [step, setStep] = useState<"qr" | "verify" | "backup">("qr");
  const [qrData, setQrData] = useState<{
    secret: string;
    qrCodeDataUrl: string;
  } | null>(null);
  const [totpToken, setTotpToken] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // Disable flow state
  const [password, setPassword] = useState("");

  const handleStartSetup = async () => {
    const res = await setup2fa.mutateAsync();
    setQrData(res.data);
    setStep("qr");
  };

  const handleConfirm = async () => {
    const res = await confirm2fa.mutateAsync(totpToken);
    setBackupCodes(res.data.backupCodes);
    setStep("backup");
  };

  const handleDisable = async () => {
    await disable2fa.mutateAsync(password);
    onClose();
  };

  const handleCopySecret = () => {
    if (qrData?.secret) {
      navigator.clipboard.writeText(qrData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-gray-600" />
            <h2 className="text-sm font-semibold text-gray-900">
              {mode === "setup"
                ? "Set up two-factor authentication"
                : "Disable two-factor authentication"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* ── DISABLE FLOW ── */}
          {mode === "disable" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-100 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                <p className="text-xs text-orange-700">
                  Disabling 2FA will make your account less secure. Enter your
                  password to confirm.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Your password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDisable}
                  disabled={!password || disable2fa.isPending}
                  className="flex-1 px-5 py-2.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {disable2fa.isPending
                    ? "Disabling..."
                    : "Disable 2FA"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── SETUP FLOW — Step 0: initiate ── */}
          {mode === "setup" && !qrData && (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto">
                <Shield className="w-6 h-6 text-gray-500" />
              </div>
              <p className="text-sm text-gray-600">
                Use an authenticator app like Google Authenticator or Authy to
                scan a QR code and generate time-based codes.
              </p>
              <button
                type="button"
                onClick={handleStartSetup}
                disabled={setup2fa.isPending}
                className="w-full px-5 py-2.5 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {setup2fa.isPending ? "Generating..." : "Get started"}
              </button>
            </div>
          )}

          {/* ── SETUP FLOW — Step 1: QR code ── */}
          {mode === "setup" && qrData && step === "qr" && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">
                Scan this QR code with your authenticator app, then click
                &ldquo;Next&rdquo; to verify.
              </p>

              {/* QR code */}
              <div className="flex justify-center">
                <div className="p-3 border border-gray-200 rounded-xl">
                  <Image
                    src={qrData.qrCodeDataUrl}
                    alt="2FA QR code"
                    width={160}
                    height={160}
                    unoptimized
                  />
                </div>
              </div>

              {/* Manual entry */}
              <div>
                <p className="text-xs text-gray-400 mb-1.5">
                  Can&apos;t scan? Enter this key manually:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg font-mono break-all">
                    {qrData.secret}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="shrink-0 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    {copied ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep("verify")}
                className="w-full px-5 py-2.5 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
              >
                Next — enter the code
              </button>
            </div>
          )}

          {/* ── SETUP FLOW — Step 2: verify TOTP ── */}
          {mode === "setup" && step === "verify" && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">
                Enter the 6-digit code from your authenticator app to confirm
                setup.
              </p>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Authentication code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={totpToken}
                  onChange={(e) =>
                    setTotpToken(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="000000"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 text-center tracking-widest font-mono text-lg"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep("qr")}
                  className="flex-1 px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={totpToken.length !== 6 || confirm2fa.isPending}
                  className="flex-1 px-5 py-2.5 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {confirm2fa.isPending ? "Verifying..." : "Enable 2FA"}
                </button>
              </div>
            </div>
          )}

          {/* ── SETUP FLOW — Step 3: backup codes ── */}
          {mode === "setup" && step === "backup" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">
                  Save these backup codes in a safe place. Each can only be
                  used once if you lose access to your authenticator.
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-1.5">
                  {backupCodes.map((code) => (
                    <code
                      key={code}
                      className="text-xs font-mono text-gray-700 bg-white border border-gray-100 rounded px-2 py-1 text-center"
                    >
                      {code}
                    </code>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyBackupCodes}
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {copied ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? "Copied!" : "Copy backup codes"}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full px-5 py-2.5 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
