"use client";

import { toast } from "sonner";
import { buildReturnTo, getSafeReturnTo } from "@/lib/auth-redirect";
import { useSessionStore } from "@/lib/stores/session-store";

/**
 * Shared reaction to a rejected session (401) - issue #1977.
 *
 * Any API helper that receives a 401 from a protected endpoint calls this
 * once: the zustand session is cleared, the user sees a "session expired"
 * toast, and the browser is sent to `/login?returnTo=<current>`. The flag
 * below coalesces parallel 401s (five failed queries must not fire five
 * redirects or five toasts) and the redirect is a full `window.location`
 * navigation, so after login the flag is gone and the next real expiry can
 * redirect again - no loop is possible because /login never calls helpers
 * that react to 401 and the login page is reachable while logged out.
 */
let redirectScheduled = false;

export function expireSession(): void {
  useSessionStore.getState().clearSession();

  if (typeof window === "undefined") return;

  const { pathname, search } = window.location;

  // Already on an auth route: the app is heading to login anyway.
  if (pathname === "/login" || pathname === "/register") return;
  if (redirectScheduled) return;

  redirectScheduled = true;
  toast.error("Your session has expired. Please sign in again.");

  const returnTo = getSafeReturnTo(
    buildReturnTo(pathname, search.replace(/^\?/, "")),
  );
  window.location.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
}
