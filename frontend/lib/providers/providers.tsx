"use client";

import { useState } from "react";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { toast, Toaster } from "sonner";
import { ThemeProvider } from "next-themes";

/**
 * Decide whether an error represents an expired session (401) or a missing
 * permission (403). CreditsApiError in lib/credits-api.ts exposes `.status`,
 * which is how API errors carry their status here; plain Error objects fall
 * back to matching their message.
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    const status = (error as { status?: unknown }).status;
    if (status === 401 || status === 403) return true;
    const message = error.message.toLowerCase();
    if (
      message.includes("401") ||
      message.includes("403") ||
      message.includes("unauthorized") ||
      message.includes("forbidden")
    ) {
      return true;
    }
  }
  return false;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // Clearing the session and redirecting to the login page on a 401 is
        // handled at the HTTP layer by the auth-guard work (#1977); this
        // configuration only stops pointless retries and surfaces the expiry
        // toast.
        queryCache: new QueryCache({
          onError: (error) => {
            if (isAuthError(error)) {
              toast.error(
                "Your session has expired. Please sign in again.",
              );
            }
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, error) =>
              !isAuthError(error) && failureCount < 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        <Toaster position="top-right" richColors />
        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
