"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthActions } from "@/lib/store/authStore";

export const useAuthInterceptor = () => {
  const router = useRouter();
  const { refreshAccessToken, logout } = useAuthActions();
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    const handleSessionExpired = async () => {
      if (isRefreshingRef.current) return;
      isRefreshingRef.current = true;

      try {
        await refreshAccessToken();
        toast.success("Session refreshed successfully");
      } catch {
        toast.error("Session expired. Please log in again.");
        logout();
        router.push("/login");
      } finally {
        isRefreshingRef.current = false;
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("session-expired", handleSessionExpired);
      return () => {
        window.removeEventListener("session-expired", handleSessionExpired);
      };
    }
  }, [refreshAccessToken, logout, router]);
};
