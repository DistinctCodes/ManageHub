"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { apiClient } from "@/lib/apiClient";
import { storage } from "@/lib/storage";
import { toast } from "sonner";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const refreshToken = searchParams.get("refreshToken");
    const error = searchParams.get("error");

    if (error) {
      toast.error("OAuth sign-in failed. Please try again.");
      router.replace("/login");
      return;
    }

    if (token) {
      // Store token in apiClient and persist
      apiClient.setToken(token);
      storage.setToken(token);

      // Update Zustand store
      useAuthStore.setState({
        accessToken: token,
        isAuthenticated: true,
      });

      // Fetch user profile now that we have a token
      apiClient
        .get<{ user: import("@/lib/types/user").User }>("/auth/me")
        .then(({ user }) => {
          useAuthStore.setState({ user });
          storage.setUser(user);
          router.replace("/dashboard");
        })
        .catch(() => {
          // Even if profile fetch fails, we're authenticated — go to dashboard
          router.replace("/dashboard");
        });
    } else {
      toast.error("No token received. Please try again.");
      router.replace("/login");
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-600 text-sm">Completing sign-in…</p>
      </div>
    </div>
  );
}