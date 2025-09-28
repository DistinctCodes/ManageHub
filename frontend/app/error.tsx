'use client'

import { useEffect } from 'react'

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Error caught by error boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-2xl font-semibold text-red-600">Something went wrong</h2>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md"
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-800 text-white rounded-md"
        >
          Reload
        </button>
      </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Error Details (Development Only)
            </summary>
            <pre className="mt-2 text-xs text-red-600 bg-red-50 p-3 rounded border overflow-auto">
              {error.message}
              {error.stack && '\n\n' + error.stack}
            </pre>
          </details>
        )}
    </div>
  )
}
