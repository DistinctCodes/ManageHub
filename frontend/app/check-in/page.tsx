"use client";

import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useGetActiveCheckIn } from "@/lib/react-query/hooks/workspace-tracking/useGetActiveCheckIn";
import { useCheckIn } from "@/lib/react-query/hooks/workspace-tracking/useCheckIn";
import { useCheckOut } from "@/lib/react-query/hooks/workspace-tracking/useCheckOut";
import { useGetMyBookings } from "@/lib/react-query/hooks/bookings/useGetMyBookings";
import {
  LogIn,
  LogOut,
  Clock,
  MapPin,
  Calendar,
  CheckCircle2,
} from "lucide-react";

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function CheckInPage() {
  const { data: activeData, isLoading: activeLoading } = useGetActiveCheckIn();
  const { data: bookingsData } = useGetMyBookings(1, 20);
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmCheckout, setConfirmCheckout] = useState(false);

  const activeLog = activeData?.data ?? null;

  // Only show bookings that are confirmed
  const eligibleBookings = (bookingsData?.data ?? []).filter(
    (b) => b.status === "CONFIRMED"
  );

  const handleCheckIn = async () => {
    if (!selectedWorkspaceId) return;
    await checkIn.mutateAsync({
      workspaceId: selectedWorkspaceId,
      bookingId: selectedBookingId || undefined,
      notes: notes || undefined,
    });
    setSelectedWorkspaceId("");
    setSelectedBookingId("");
    setNotes("");
  };

  const handleCheckOut = async () => {
    if (!activeLog) return;
    await checkOut.mutateAsync(activeLog.id);
    setConfirmCheckout(false);
  };

  if (activeLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Check In / Out</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Track your workspace sessions.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Active session */}
        {activeLog ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-sm font-semibold text-emerald-800">
                Active session
              </h2>
            </div>

            <div className="space-y-3">
              {activeLog.workspace && (
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>
                    {activeLog.workspace.name}{" "}
                    <span className="text-emerald-500 capitalize">
                      ({activeLog.workspace.type})
                    </span>
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Checked in at {formatDateTime(activeLog.checkedInAt)}</span>
              </div>
              {activeLog.notes && (
                <p className="text-xs text-emerald-600 italic">
                  &quot;{activeLog.notes}&quot;
                </p>
              )}
            </div>

            <div className="mt-5">
              {!confirmCheckout ? (
                <button
                  type="button"
                  onClick={() => setConfirmCheckout(true)}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Check out
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCheckOut}
                    disabled={checkOut.isPending}
                    className="px-5 py-2.5 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {checkOut.isPending ? "Checking out..." : "Confirm check-out"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmCheckout(false)}
                    className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Check-in form */
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <LogIn className="w-4 h-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-900">
                Check in to a workspace
              </h2>
            </div>

            <div className="space-y-4">
              {/* Booking selector */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Link to a booking{" "}
                  <span className="text-gray-400">(optional)</span>
                </label>
                <select
                  value={selectedBookingId}
                  onChange={(e) => {
                    const bookingId = e.target.value;
                    setSelectedBookingId(bookingId);
                    if (bookingId) {
                      const b = eligibleBookings.find(
                        (b) => b.id === bookingId
                      );
                      if (b) setSelectedWorkspaceId(b.workspaceId);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
                >
                  <option value="">— No booking —</option>
                  {eligibleBookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      Booking #{b.id.slice(0, 8)} — {b.planType}
                    </option>
                  ))}
                </select>
              </div>

              {/* Workspace ID (manual if no booking selected) */}
              {!selectedBookingId && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Workspace ID{" "}
                    <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={selectedWorkspaceId}
                    onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                    placeholder="Enter workspace UUID"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Notes <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Working on client project"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 resize-none"
                />
              </div>

              <button
                type="button"
                onClick={handleCheckIn}
                disabled={!selectedWorkspaceId || checkIn.isPending}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                {checkIn.isPending ? "Checking in..." : "Check in"}
              </button>
            </div>
          </div>
        )}

        {/* No active session info */}
        {!activeLog && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-700">
                No active session
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Check in to start tracking your workspace time. Your sessions
                are linked to your bookings and invoices.
              </p>
            </div>
          </div>
        )}

        {/* Eligible bookings hint */}
        {eligibleBookings.length > 0 && !activeLog && (
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Your confirmed bookings
              </h3>
            </div>
            <ul className="space-y-2">
              {eligibleBookings.slice(0, 5).map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-700 capitalize">
                    {b.planType} — {b.seatCount} seat{b.seatCount !== 1 && "s"}
                  </span>
                  <span className="text-xs text-gray-400 capitalize">
                    {b.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
