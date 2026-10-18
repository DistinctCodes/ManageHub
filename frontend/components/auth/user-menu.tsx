"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useSessionStore } from "@/lib/stores/session-store";
import { useSignOut } from "@/components/auth/use-sign-out";

/**
 * Small identity chip with a Sign out control (issue #1974). Rendered in the
 * header of every authenticated surface - member pages and the admin layout -
 * so signing out is available wherever the user is working.
 */
export function UserMenu() {
  const user = useSessionStore((state) => state.user);
  const signOut = useSignOut();
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3 text-sm">
      <span
        className="hidden text-gray-500 dark:text-gray-400 sm:inline"
        title={user.email}
      >
        {user.email}
      </span>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
      >
        <LogOut className="h-3.5 w-3.5" />
        {busy ? "Signing out..." : "Sign out"}
      </button>
    </div>
  );
}
