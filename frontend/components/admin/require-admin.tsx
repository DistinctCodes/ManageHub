"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { buildReturnTo, getSafeReturnTo } from "@/lib/auth-redirect";
import { useSessionHydration } from "@/lib/stores/use-session-hydration";
import { useSessionStore } from "@/lib/stores/session-store";

/**
 * The token comes from the session store, which is hydrated once inside a
 * client effect (issue #1983): no cookie is read during render, so the
 * server-rendered markup and the first client render agree, and the gate
 * re-renders reactively when the token changes (for example after sign-out
 * in another tab). The former `useAdminToken` (a plain per-render cookie
 * read) is replaced by `useSessionToken` from use-session-hydration.
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const hydrated = useSessionHydration();
  const token = useSessionStore((state) => state.accessToken);
  const pathname = usePathname();
  const router = useRouter();
  const [returnTo, setReturnTo] = useState(pathname);
  const loginHref = `/login?returnTo=${encodeURIComponent(returnTo)}`;

  useEffect(() => {
    const currentReturnTo = getSafeReturnTo(
      buildReturnTo(pathname, window.location.search.replace(/^\?/, "")),
    );
    setReturnTo(currentReturnTo);
    if (hydrated && !token) {
      router.replace(`/login?returnTo=${encodeURIComponent(currentReturnTo)}`);
    }
  }, [pathname, router, token, hydrated]);

  if (!hydrated) {
    return (
      <div
        className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-gray-500 dark:text-gray-400"
        role="status"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking your session...
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex max-w-md flex-col items-center gap-3 rounded-lg border border-dashed border-gray-300 px-6 py-12 text-center dark:border-gray-700">
        <ShieldAlert className="h-8 w-8 text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
          Admin sign-in required
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          These pages call ADMIN-gated API endpoints. Sign in with an admin
          account so an <code className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-800">accessToken</code> cookie is present.
        </p>
        <Link
          href={loginHref}
          className="text-sm font-medium text-blue-600 underline hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Sign in to continue
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}
