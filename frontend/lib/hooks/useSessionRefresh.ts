"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/store/authStore";

const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

function parseJwtPayload(token: string): { exp?: number } | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export const useSessionRefresh = () => {
  const router = useRouter();
  const warningShownRef = useRef(false);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRefreshRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const scheduleRefresh = useCallback((token: string) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    warningShownRef.current = false;

    const payload = parseJwtPayload(token);
    if (!payload?.exp) return;

    const expiresAt = payload.exp * 1000;
    const now = Date.now();
    const msUntilRefresh = expiresAt - now - REFRESH_THRESHOLD_MS;
    const msUntilExpiry = expiresAt - now;

    if (msUntilRefresh <= 0) {
      attemptRefreshRef.current();
      return;
    }

    refreshTimeoutRef.current = setTimeout(() => {
      attemptRefreshRef.current();
    }, msUntilRefresh);

    const warningDelay = Math.max(msUntilExpiry - 60_000, 0);
    if (warningDelay > 0) {
      setTimeout(() => {
        if (!warningShownRef.current) {
          warningShownRef.current = true;
          toast.warning(
            "Your session will expire in less than a minute. Saving your work...",
            { duration: 8000 }
          );
        }
      }, warningDelay);
    }
  }, []);

  const attemptRefresh = useCallback(async () => {
    const { refreshAccessToken } = useAuthStore.getState();
    try {
      await refreshAccessToken();
      const newToken = useAuthStore.getState().accessToken;
      if (newToken) {
        scheduleRefresh(newToken);
      }
    } catch {
      toast.error("Session expired. Please log in again.");
      useAuthStore.getState().logout();
      router.push("/login");
    }
  }, [router, scheduleRefresh]);

  useEffect(() => {
    attemptRefreshRef.current = attemptRefresh;
  }, [attemptRefresh]);

  useEffect(() => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      scheduleRefresh(token);
    }

    const unsubscribe = useAuthStore.subscribe((state, prevState) => {
      if (state.accessToken && state.accessToken !== prevState.accessToken) {
        scheduleRefresh(state.accessToken);
      }
    });

    const handleSessionExpired = () => {
      toast.error("Session expired. Please log in again.");
      useAuthStore.getState().logout();
      router.push("/login");
    };

    if (typeof window !== "undefined") {
      window.addEventListener("session-expired", handleSessionExpired);
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener("session-expired", handleSessionExpired);
      }
    };
  }, [scheduleRefresh, router]);
};
