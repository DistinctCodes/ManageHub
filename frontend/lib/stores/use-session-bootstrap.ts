"use client";

import { useEffect } from "react";
import { me } from "@/lib/auth-api";
import { useSessionStore } from "@/lib/stores/session-store";

/**
 * Restores the session after a page reload (issue #1975 / issue #1973).
 *
 * The HttpOnly `accessToken` cookie cannot be read from JavaScript, so the
 * client learns who is signed in by calling `GET /auth/me` once inside a
 * client effect (never during render), which keeps server-rendered markup and
 * the first client render identical and avoids hydration mismatches
 * (issue #1983's root cause). `auth-api.me()` is single-flight, so several
 * mounted callers share one request.
 */
export function useSessionBootstrap(): void {
  const status = useSessionStore((state) => state.status);

  useEffect(() => {
    if (status !== "unknown") return;

    me()
      .then((user) => {
        // A later action (logout, expiry) may have resolved the state on a
        // different instance; only set the session if we are still unknown.
        if (useSessionStore.getState().status === "unknown") {
          useSessionStore.getState().setSession(user);
        }
      })
      .catch(() => {
        // me() already clears the session and redirects on a 401; anything
        // else (offline, 5xx) means we simply cannot prove an active session.
        if (useSessionStore.getState().status === "unknown") {
          useSessionStore.getState().clearSession();
        }
      });
  }, [status]);
}
