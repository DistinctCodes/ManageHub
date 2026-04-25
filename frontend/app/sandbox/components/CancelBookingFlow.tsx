"use client";

import { useState } from "react";

interface Booking {
  id: string;
  workspaceName: string;
  date: string;
  amount: string;
}

interface Props {
  booking: Booking;
  onSuccess: () => void;
  onClose: () => void;
}

type Step = "confirm" | "success" | "error";

export function CancelBookingFlow({ booking, onSuccess, onClose }: Props) {
  const [step, setStep] = useState<Step>("confirm");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleConfirm = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      // Replace with real API call
      await new Promise((res) => setTimeout(res, 1000));
      setStep("success");
      onSuccess();
    } catch {
      setErrorMsg("Cancellation failed. Please try again.");
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">

        {step === "confirm" && (
          <>
            <h2 className="mb-1 text-lg font-semibold text-gray-900">Cancel Booking?</h2>
            <p className="mb-4 text-sm text-gray-500">
              This action cannot be undone. Please review your booking details.
            </p>
            <div className="mb-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-700 space-y-1">
              <div><span className="font-medium">Workspace:</span> {booking.workspaceName}</div>
              <div><span className="font-medium">Date:</span> {booking.date}</div>
              <div><span className="font-medium">Amount:</span> {booking.amount}</div>
            </div>
            <p className="mb-5 text-xs text-amber-600 font-medium">
              ⚠ A refund will be processed within 5–7 business days.
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Keep Booking
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                )}
                {loading ? "Cancelling…" : "Yes, Cancel"}
              </button>
            </div>
          </>
        )}

        {step === "success" && (
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Booking Cancelled</h2>
            <p className="text-sm text-gray-500">
              Your refund of {booking.amount} will be processed within 5–7 business days.
            </p>
            <a href="/bookings" className="inline-block mt-2 text-sm font-medium text-blue-600 hover:underline">
              ← Back to bookings
            </a>
          </div>
        )}

        {step === "error" && (
          <div className="space-y-4">
            <p className="text-sm text-red-600 font-medium">{errorMsg}</p>
            <div className="flex gap-3">
              <button onClick={() => setStep("confirm")} className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Try Again
              </button>
              <button onClick={onClose} className="flex-1 rounded-lg bg-gray-800 py-2 text-sm font-medium text-white hover:bg-gray-900">
                Close
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default CancelBookingFlow;
