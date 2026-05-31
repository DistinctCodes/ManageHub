import React from 'react';
import { useSessionTimer } from './useSessionTimer';

interface Props {
  expiresAt: number | null;
  onExtend: () => void;
  onSignOut: () => void;
}

export const SessionTimeoutModal: React.FC<Props> = ({ expiresAt, onExtend, onSignOut }) => {
  const { secondsLeft, showWarning } = useSessionTimer(expiresAt);

  if (!showWarning) return null;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const display = `${mins}:${String(secs).padStart(2, '0')}`;

  return (
    <div role="dialog" aria-modal="true" aria-label="Session timeout warning" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-80 text-center space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Session expiring soon</h2>
        <p className="text-sm text-gray-600">Your session will expire in</p>
        <p className="text-3xl font-mono font-bold text-red-600" aria-live="polite">{display}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onExtend} className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
            Stay signed in
          </button>
          <button onClick={onSignOut} className="px-4 py-2 border border-gray-300 text-sm rounded hover:bg-gray-50">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};