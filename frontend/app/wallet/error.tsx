"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function WalletError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    Sentry.captureException(error, {
      tags: {
        errorBoundary: "wallet",
      },
    });
  }, [error]);

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <div
        className="rounded-lg border border-red-200 dark:border-red-900 p-6 space-y-4"
        role="alert"
      >
        <h2 className="text-lg font-semibold">
          Something went wrong loading your wallet
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          This is on us, not you. You can try again, or come back later.
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-gray-900 text-white dark:bg-white dark:text-gray-900 px-4 py-2 text-sm font-medium"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
