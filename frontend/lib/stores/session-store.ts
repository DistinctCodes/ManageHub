"use client";

import { create } from "zustand";
import Cookies from "js-cookie";

export const ACCESS_TOKEN_COOKIE = "accessToken";

/**
 * localStorage signal written whenever the session changes (issue #1983).
 * Cookies raise no cross-tab events, so other tabs listen for this key's
 * `storage` event and re-read the session store, keeping them in step when
 * a user signs out (or in) in a different tab.
 */
export const SESSION_SIGNAL_KEY = "managehub-session-signal";

function emitSessionSignal(): void {
  try {
    localStorage.setItem(SESSION_SIGNAL_KEY, String(Date.now()));
  } catch {
    // Private browsing etc. - cross-tab sync is best effort.
  }
}

interface SessionState {
  /**
   * Null until `hydrate()` has run in the client: the cookie must never be
   * read synchronously at store creation or during render, because the
   * server render and the first client render would disagree and produce a
   * hydration mismatch. Pages gate on `hydrated` before trusting the token.
   */
  accessToken: string | null;
  hydrated: boolean;
  setAccessToken: (token: string | null) => void;
  hydrate: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  accessToken: null,
  hydrated: false,
  setAccessToken: (token) => {
    if (token) {
      Cookies.set(ACCESS_TOKEN_COOKIE, token, {
        sameSite: "lax",
        secure: window.location.protocol === "https:",
      });
    } else {
      Cookies.remove(ACCESS_TOKEN_COOKIE);
    }
    emitSessionSignal();
    set({ accessToken: token, hydrated: true });
  },
  hydrate: () => {
    if (typeof window === "undefined") return;
    set({
      accessToken: Cookies.get(ACCESS_TOKEN_COOKIE) ?? null,
      hydrated: true,
    });
  },
}));
