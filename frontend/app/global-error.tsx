'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Root layout error caught by global-error.tsx:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Something went wrong</h1>
          <p style={{ color: '#666', marginBottom: '1.5rem', maxWidth: '32rem' }}>
            A critical error occurred. Please try again. If the problem persists, contact support.
          </p>
          <button onClick={reset} style={{ padding: '0.625rem 1.25rem', fontSize: '0.875rem', fontWeight: 500, borderRadius: '0.375rem', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}>
            Try again
          </button>
          {error.digest && (
            <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#999' }}>
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
