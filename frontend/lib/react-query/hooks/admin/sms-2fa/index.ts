/**
 * SMS 2FA hooks (FE-34)
 *
 * Location: frontend/lib/react-query/hooks/admin/sms-2fa/
 *   useEnableSmsTwoFactor.ts
 *   useVerifySmsTwoFactor.ts
 *   useDisableSmsTwoFactor.ts
 *
 * All three are exported from this single file for convenience.
 * Split into individual files if your project enforces one-hook-per-file.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

// ── Enable (step 1) ────────────────────────────────────────────────────────

interface EnableSmsPayload {
  phone: string;
}

export function useEnableSmsTwoFactor() {
  return useMutation({
    mutationFn: (payload: EnableSmsPayload) =>
      axios.post("/api/auth/2fa/sms/enable", payload),
  });
}

// ── Verify setup (step 2) ─────────────────────────────────────────────────

interface VerifySmsPayload {
  otp: string;
}

export function useVerifySmsTwoFactor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: VerifySmsPayload) =>
      axios.post("/api/auth/2fa/sms/verify-setup", payload),
    onSuccess: () => {
      // Refresh auth/user data so the settings toggle reflects the new state
      queryClient.invalidateQueries({ queryKey: ["user", "me"] });
    },
  });
}

// ── Disable ───────────────────────────────────────────────────────────────

interface DisableSmsPayload {
  currentPassword: string;
}

export function useDisableSmsTwoFactor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DisableSmsPayload) =>
      axios.post("/api/auth/2fa/sms/disable", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "me"] });
    },
  });
}

// ── Send code (during login) ─────────────────────────────────────────────

export function useSendSmsCode() {
  return useMutation({
    mutationFn: (userId: string) =>
      axios.post("/api/auth/2fa/sms/send-code", { userId }),
  });
}

// ── Verify code (during login) ────────────────────────────────────────────

interface VerifyLoginPayload {
  userId: string;
  otp: string;
}

export function useVerifySmsLoginCode() {
  return useMutation({
    mutationFn: (payload: VerifyLoginPayload) =>
      axios.post("/api/auth/2fa/sms/verify", payload),
  });
}