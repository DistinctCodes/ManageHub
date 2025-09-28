"use client";

import { useEffect } from "react";

interface GlobalErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalErrorPage({ error, reset }: GlobalErrorPageProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global application error:", error);
  }, [error]);

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center bg-gray-50">
          <div className="space-y-6 max-w-md">
            <div className="relative">
              <div className="flex items-center justify-center">
                <div className="p-4 bg-red-100 rounded-full">
                  <svg
                    className="h-16 w-16 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                Something went wrong
              </h2>
              <p className="mt-2 text-gray-600">
                A critical error occurred. Please reload the page to continue.
              </p>
            </div>

            <div className="flex flex-col gap-4 justify-center">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Try Again
              </button>
              
              <button
                onClick={handleReload}
                className="inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Reload Page
              </button>

              <a
                href="/"
                className="inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Go to Homepage
              </a>
            </div>

            {process.env.NODE_ENV === "development" && (
              <details className="mt-6 text-left bg-gray-50 rounded-lg border border-gray-200 transition-all duration-200 hover:border-gray-300">
                <summary className="cursor-pointer p-4 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200 flex items-center gap-2 select-none">
                  <svg className="w-4 h-4 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Error Details (Development Mode)
                </summary>
                <div className="px-4 pb-4">
                  <div className="mt-2 space-y-3">
                    <div className="bg-white rounded-md border border-gray-200">
                      <div className="px-3 py-2 bg-red-50 border-b border-gray-200 rounded-t-md">
                        <h4 className="text-sm font-semibold text-red-800 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          Error Message
                        </h4>
                      </div>
                      <div className="p-3">
                        <p className="text-sm text-gray-800 font-mono break-words">
                          {error.message || 'No error message available'}
                        </p>
                      </div>
                    </div>
                    
                    {error.stack && (
                      <div className="bg-white rounded-md border border-gray-200">
                        <div className="px-3 py-2 bg-yellow-50 border-b border-gray-200 rounded-t-md">
                          <h4 className="text-sm font-semibold text-yellow-800 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            Stack Trace
                          </h4>
                        </div>
                        <div className="p-3 max-h-48 overflow-y-auto error-details-scroll">
                          <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap break-all leading-relaxed">
                            {error.stack}
                          </pre>
                        </div>
                      </div>
                    )}
                    
                    {error.digest && (
                      <div className="bg-white rounded-md border border-gray-200">
                        <div className="px-3 py-2 bg-blue-50 border-b border-gray-200 rounded-t-md">
                          <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
                            </svg>
                            Error ID
                          </h4>
                        </div>
                        <div className="p-3">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-800">
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
      </body>
    </html>
  );
}