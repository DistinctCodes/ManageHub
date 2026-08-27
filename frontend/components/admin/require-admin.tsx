"use client";

import { Button } from "@/components/app-ui";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";

export function RequireAdmin({
  children,
}: {
  children: React.ReactNode;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setToken(Cookies.get("accessToken") ?? null);
    setReady(true);
  }, []);

  if (!ready) {
    return null;
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
          Admin access required
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Sign in with an administrator to manage payments.
        </p>
        <a
          href={process.env.NEXT_PUBLIC_API_URL ?? ""}
          className="mt-4 inline-block"
        >
          <Button type="button">Sign in</Button>
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
