import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export const metadata = {
  title: "Not authorised",
};

/**
 * Landing page for member-role tokens that try to open /admin/* routes
 * (issue #1973). The middleware redirects non-admin sessions here; the
 * backend still enforces authorization on every admin endpoint.
 */
export default function AdminForbiddenPage() {
  return (
    <main className="mx-auto max-w-lg px-6 py-20">
      <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-red-300 px-8 py-12 text-center dark:border-red-700">
        <ShieldAlert className="h-10 w-10 text-red-400" />
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
          Not authorised
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Your account does not have the admin role, so the admin area is
          unavailable. If you should have access, ask an administrator to
          upgrade your account.
        </p>
        <Link
          href="/wallet"
          className="text-sm font-medium text-blue-600 underline hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Back to your wallet
        </Link>
      </div>
    </main>
  );
}
