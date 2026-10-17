"use client";

import { useEffect } from "react";
import {
  SESSION_SIGNAL_KEY,
  useSessionStore,
} from "@/lib/stores/session-store";

/**
 * Hydrates the session store once inside a client effect (issue #1983).
 *
 * Reading the auth cookie synchronously - at store creation or during
 * render - makes the server-rendered markup disagree with the first client
 * render ("Sign in to view usage" vs. content) and produces hydration
 * mismatches on /usage, /credits and admin pages. It also made auth state
 * non-reactive: nothing re-read the cookie when another tab signed out.
 *
 * This hook runs `hydrate()` once in an effect (no render-time reads), and
 * re-runs it whenever another tab issues a session change signal
 * (`storage` event). Pages gate their rendering on the returned flag.
 */
export function useSessionHydration(): boolean {
  const hydrated = useSessionStore((state) => state.hydrated);

  useEffect(() => {
    useSessionStore.getState().hydrate();

    const onStorage = (event: StorageEvent) => {
      if (event.key === SESSION_SIGNAL_KEY) {
        useSessionStore.getState().hydrate();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return hydrated;
}

/**
 * Reactive replacement for the old non-hook `useAdminToken` cookie read
 * (issue #1983): the token comes from the session store, so sign-out in
 * another tab unsets it here too. Returns null before hydration, letting
 * callers render a stable "checking" state that matches the server output.
 */
export function useSessionToken(): string | null {
  useSessionHydration();
  return useSessionStore((state) => state.accessToken);
}
