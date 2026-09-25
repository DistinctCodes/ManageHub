'use client';

import { useEffect, useState } from 'react';

/**
 * Displays a sticky banner when the browser reports the network is offline.
 * Closes #1862
 */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);

    // Sync with current state on mount
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-center py-2 text-sm font-medium"
    >
      You are offline. Some features may be unavailable.
    </div>
  );
}
