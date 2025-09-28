"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center bg-gray-50 dark:bg-gray-900">
      <div className="space-y-6 max-w-md animate-fade-in">
        <div className="relative">
          <div className="flex items-center justify-center">
            <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full animate-pulse">
              <AlertCircle className="h-16 w-16 text-red-500" />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Something went wrong
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            An unexpected error occurred. Don't worry, our team has been notified.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={reset} variant="primary" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Button variant="secondary" onClick={handleReload} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Reload Page
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <Link href="/">
            <Button variant="secondary" className="gap-2 w-full">
              <Home className="h-4 w-4" />
              Go to Homepage
            </Button>
          </Link>
          
          {process.env.NODE_ENV === "development" && (
            <details className="mt-6 text-left bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600">
              <summary className="cursor-pointer p-4 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors duration-200 flex items-center gap-2 select-none">
                <svg className="w-4 h-4 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Error Details (Development Mode)
              </summary>
              <div className="px-4 pb-4">
                <div className="mt-2 space-y-3">
                  <div className="bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-600">
                    <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border-b border-gray-200 dark:border-gray-600 rounded-t-md">
                      <h4 className="text-sm font-semibold text-red-800 dark:text-red-200 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Error Message
                      </h4>
                    </div>
                    <div className="p-3">
                      <p className="text-sm text-gray-800 dark:text-gray-200 font-mono break-words">
                        {error.message || 'No error message available'}
                      </p>
                    </div>
                  </div>
                  
                  {error.stack && (
                    <div className="bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-600">
                      <div className="px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b border-gray-200 dark:border-gray-600 rounded-t-md">
                        <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          Stack Trace
                        </h4>
                      </div>
                      <div className="p-3 max-h-48 overflow-y-auto error-details-scroll">
                        <pre className="text-xs text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap break-all leading-relaxed">
                          {error.stack}
                        </pre>
                      </div>
                    </div>
                  )}
                  
                  {error.digest && (
                    <div className="bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-600">
                      <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-600 rounded-t-md">
                        <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
                          </svg>
                          Error ID
                        </h4>
                      </div>
                      <div className="p-3">
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono text-gray-800 dark:text-gray-200">
                          {error.digest}
                        </code>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}