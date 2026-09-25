"use client";

import Cookies from "js-cookie";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { buildReturnTo, getSafeReturnTo } from "@/lib/auth-redirect";

export function useAdminToken(): string | null {
  return Cookies.get("accessToken") ?? null;
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const token = useAdminToken();
  const pathname = usePathname();
  const router = useRouter();
  const [returnTo, setReturnTo] = useState(pathname);
  const loginHref = `/login?returnTo=${encodeURIComponent(returnTo)}`;

  useEffect(() => {
    const currentReturnTo = getSafeReturnTo(
      buildReturnTo(pathname, window.location.search.replace(/^\?/, "")),
    );
    setReturnTo(currentReturnTo);
    if (!token) {
      router.replace(`/login?returnTo=${encodeURIComponent(currentReturnTo)}`);
    }
  }, [pathname, router, token]);

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
