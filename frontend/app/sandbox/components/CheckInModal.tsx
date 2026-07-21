"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  type: "checkin" | "checkout";
  workspaceName: string;
  currentTime: string;
  checkInTime?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

function getDuration(from: string, to: string): string {
  const diff = Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  return `${h}h ${m}m`;
}

export function CheckInModal({
  type,
  workspaceName,
  currentTime,
  checkInTime,
  onConfirm,
  onCancel,
}: Props) {
  const [loading, setLoading] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onCancel();
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">
          {type === "checkin" ? "Confirm Check-In" : "Confirm Check-Out"}
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          {type === "checkin" ? "You are about to check in to:" : "You are about to check out of:"}
        </p>

        <div className="mb-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-700 space-y-1">
          <div><span className="font-medium">Workspace:</span> {workspaceName}</div>
          <div><span className="font-medium">Time:</span> {currentTime}</div>
          {type === "checkout" && checkInTime && (
            <div>
              <span className="font-medium">Duration:</span>{" "}
              {getDuration(checkInTime, currentTime)}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
              </svg>
            )}
            {loading ? "Processing…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
