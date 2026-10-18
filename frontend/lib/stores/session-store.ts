"use client";

import { create } from "zustand";
import type { AuthUser } from "@/lib/auth-types";

/**
 * The access token is kept in memory only: the backend owns the real session
 * through its HttpOnly `accessToken` cookie (issue #1975), and the client must
 * not keep a JavaScript-readable copy (no js-cookie mirror). A JavaScript-
 * readable cookie also had to be read synchronously at store creation, which
 * made server-rendered markup disagree with the first client render and
 * caused hydration mismatches (issue #1983's root cause). What the client
 * needs - who the user is and which role they hold - is restored from
 * `GET /auth/me` inside a client effect instead.
 */
export type SessionStatus = "unknown" | "authenticated" | "unauthenticated";

interface SessionState {
  user: AuthUser | null;
  /** Memory-only copy of the login/register response token. Not persisted. */
  accessToken: string | null;
  status: SessionStatus;
  setSession: (user: AuthUser, accessToken?: string | null) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  accessToken: null,
  status: "unknown",
  setSession: (user, accessToken = null) =>
    set({ user, accessToken, status: "authenticated" }),
  clearSession: () =>
    set({ user: null, accessToken: null, status: "unauthenticated" }),
}));
