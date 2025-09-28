"use client";

import { useEffect } from "react";

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
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="text-center space-y-6 max-w-md">
        <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
        <p className="text-gray-600">
          An unexpected error occurred. Please try again.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={handleReload}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Reload
          </button>
        </div>

        {/* Minimal Error Showcase */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-8 max-w-lg w-full">
            <details className="bg-gray-50 border rounded-lg p-4">
              <summary className="cursor-pointer font-medium text-gray-700">
                Error Details
              </summary>
              <div className="mt-3 space-y-2">
                <div className="text-sm">
                  <strong>Message:</strong> {error.message || "Unknown error"}
                </div>
                {error.digest && (
                  <div className="text-sm">
                    <strong>ID:</strong> <code className="bg-gray-200 px-1 rounded">{error.digest}</code>
                  </div>
                )}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}