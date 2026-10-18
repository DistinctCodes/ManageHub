"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useSessionStore } from "@/lib/stores/session-store";
import { logout } from "@/lib/auth-api";

/**
 * Shared sign-out flow (issue #1974): call `POST /auth/logout` with
 * credentials (the backend clears the HttpOnly cookie and revokes every
 * outstanding token), then drop the local session and the React Query cache
 * so no signed-in data survives, and send the user to the login page.
 */
export function useSignOut(): () => Promise<void> {
  const router = useRouter();
  const queryClient = useQueryClient();

  return async () => {
    await logout();
    queryClient.clear();
    useSessionStore.getState().clearSession();
    router.replace("/login");
  };
}
