"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // global-error.tsx replaces the root layout entirely when it renders, so
  // it must supply its own <html>/<body> -- app/layout.tsx is not mounted
  // when this is on screen.
  return (
    <html lang="en">
      <body className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-50 antialiased">
        <main className="mx-auto max-w-lg px-4 py-10">
          <div
            className="rounded-lg border border-red-200 dark:border-red-900 p-6 space-y-4"
            role="alert"
          >
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We hit an unexpected error. Please try again.
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
      </body>
    </html>
  );
}
