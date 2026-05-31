import { useEffect, useState } from 'react';

const WARN_BEFORE_SECONDS = 5 * 60; // 5 minutes

export function useSessionTimer(expiresAt: number | null): { secondsLeft: number; showWarning: boolean } {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!expiresAt) return;

    const tick = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return { secondsLeft, showWarning: secondsLeft > 0 && secondsLeft <= WARN_BEFORE_SECONDS };
}