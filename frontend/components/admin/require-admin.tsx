"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { buildReturnTo, getSafeReturnTo } from "@/lib/auth-redirect";
import { useSessionBootstrap } from "@/lib/stores/use-session-bootstrap";
import { useSessionStore } from "@/lib/stores/session-store";

/**
 * An account may open ADMIN-gated API endpoints only with an admin role
 * (issue #1973). The role comes from `GET /auth/me` (restored through the
 * session store, never from `document.cookie`); the middleware enforces the
 * same check server-side, this component is the client-side backstop.
 */
export function isAdminRole(role: string | null | undefined): boolean {
  return (role ?? "").toLowerCase() === "admin";
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  useSessionBootstrap();
  const user = useSessionStore((state) => state.user);
  const status = useSessionStore((state) => state.status);
  const pathname = usePathname();
  const router = useRouter();
  const [returnTo, setReturnTo] = useState(pathname);
  const loginHref = `/login?returnTo=${encodeURIComponent(returnTo)}`;

  useEffect(() => {
    const currentReturnTo = getSafeReturnTo(
      buildReturnTo(pathname, window.location.search.replace(/^\?/, "")),
    );
    setReturnTo(currentReturnTo);
    if (status === "unauthenticated") {
      router.replace(`/login?returnTo=${encodeURIComponent(currentReturnTo)}`);
    }
  }, [pathname, router, status]);

  if (status === "unknown") {
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

  if (status === "unauthenticated" || !user) {
    return (
      <div className="flex max-w-md flex-col items-center gap-3 rounded-lg border border-dashed border-gray-300 px-6 py-12 text-center dark:border-gray-700">
        <ShieldAlert className="h-8 w-8 text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
          Admin sign-in required
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          These pages call ADMIN-gated API endpoints. Sign in with an admin
          account to continue.
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

  if (!isAdminRole(user.role)) {
    return (
      <div className="flex max-w-md flex-col items-center gap-3 rounded-lg border border-dashed border-red-300 px-6 py-12 text-center dark:border-red-700">
        <ShieldAlert className="h-8 w-8 text-red-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
          Not authorised
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Your account is signed in as a member, but this area requires the
          admin role. Ask an administrator to upgrade your account.
        </p>
        <Link
          href="/wallet"
          className="text-sm font-medium text-blue-600 underline hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Back to your wallet
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
