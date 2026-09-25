'use client';

import { useEffect } from 'react';

type ToastVariant = 'success' | 'error' | 'info';

interface AdminToastProps {
  message: string;
  variant?: ToastVariant;
  onClose: () => void;
  durationMs?: number;
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'bg-green-600',
  error:   'bg-red-600',
  info:    'bg-blue-600',
};

/**
 * Single consistent toast component for all admin actions.
 * Closes #1865
 */
export function AdminToast({ message, variant = 'info', onClose, durationMs = 4000 }: AdminToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, durationMs);
    return () => clearTimeout(timer);
  }, [onClose, durationMs]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg text-white shadow-lg text-sm ${VARIANT_STYLES[variant]}`}
    >
      <span className="flex-1">{message}</span>
      <button onClick={onClose} aria-label="Dismiss notification" className="font-bold text-white/80 hover:text-white">✕</button>
    </div>
  );
}
