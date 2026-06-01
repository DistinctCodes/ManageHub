import React, { useEffect, useState } from 'react';

const REASONS = ['Schedule change', 'Found a better option', 'Other'];
interface Props { bookingId: string; workspaceName: string; startDate: string; isOpen: boolean; onConfirm: (r: string) => void; onClose: () => void; }

export function CancelBookingModal({ workspaceName, startDate, isOpen, onConfirm, onClose }: Props) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-semibold text-lg">Cancel Booking</h2>
        <p className="text-sm">Cancelling <strong>{workspaceName}</strong> on {new Date(startDate).toLocaleDateString()}</p>
        <p className="text-xs text-muted-foreground">Cancellations made 24+ hours before the booking start are eligible for a refund.</p>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border rounded p-2 text-sm">
          <option value="">Select a reason</option>
          {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose}>Keep Booking</button>
          <button disabled={!reason} onClick={() => onConfirm(reason)} className="btn-danger disabled:opacity-50">Confirm Cancel</button>
        </div>
      </div>
    </div>
  );
}