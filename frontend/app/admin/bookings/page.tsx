"use client";

import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useGetAllBookings } from "@/lib/hooks/useGetAllBookings";
import { toast } from "sonner";

type Status = "ALL" | "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

export default function AdminBookingsPage() {
  const [statusFilter, setStatusFilter] = useState<Status>("ALL");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: "cancel" | "complete" | null;
    bookingId: string | null;
  }>({ open: false, action: null, bookingId: null });

  const { bookings, counts, loading, error, mutateBooking, pagination } = useGetAllBookings(statusFilter);

  const handleAction = async (id: string, action: "cancel" | "complete" | "confirm") => {
    try {
      await mutateBooking(id, action);
      toast.success(`Booking ${action}ed successfully`);
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} booking`);
    } finally {
      setConfirmDialog({ open: false, action: null, bookingId: null });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Admin Bookings Management</h1>

        {/* Status filter tabs */}
        <div className="flex gap-4">
          {(["ALL", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as Status[]).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                statusFilter === status
                  ? "bg-gray-900 text-white"
                  : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {status}
              <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-xs">
                {counts[status.toLowerCase()] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 w-full animate-pulse rounded-md bg-gray-200" />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && <p className="text-red-600">Failed to load bookings.</p>}

        {/* Empty state */}
        {!loading && bookings.length === 0 && <p>No bookings found.</p>}

        {/* Table */}
        {!loading && bookings.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Workspace</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Seats</th>
                  <th className="px-4 py-3">Total (₦)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">{b.memberName ?? "Unknown member"}</td>
                    <td className="px-4 py-3">{b.workspaceName ?? "Unknown workspace"}</td>
                    <td className="px-4 py-3">{b.planType}</td>
                    <td className="px-4 py-3">{b.startDate} - {b.endDate}</td>
                    <td className="px-4 py-3">{b.seats ?? b.seatCount}</td>
                    <td className="px-4 py-3">₦{b.totalAmount}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                    {b.status === "PENDING" && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleAction(b.id, "confirm")}
                          className="rounded-md bg-gray-900 px-3 py-2 text-white"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDialog({ open: true, action: "cancel", bookingId: b.id })}
                          className="rounded-md bg-red-600 px-3 py-2 text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {b.status === "CONFIRMED" && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmDialog({ open: true, action: "complete", bookingId: b.id })}
                          className="rounded-md bg-emerald-600 px-3 py-2 text-white"
                        >
                          Complete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDialog({ open: true, action: "cancel", bookingId: b.id })}
                          className="rounded-md bg-red-600 px-3 py-2 text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              disabled={pagination.page === 1}
              onClick={pagination.prev}
              className="rounded-lg border border-gray-200 px-4 py-2 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={pagination.page === pagination.totalPages}
              onClick={pagination.next}
              className="rounded-lg border border-gray-200 px-4 py-2 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}

        {/* Confirmation dialog */}
        {confirmDialog.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-gray-900">Confirm Action</h2>
              <p className="mt-3 text-sm text-gray-600">
              Are you sure you want to {confirmDialog.action} this booking? This action cannot be undone.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDialog({ open: false, action: null, bookingId: null })}
                  className="rounded-lg border border-gray-200 px-4 py-2"
                >
                Cancel
                </button>
                <button
                  type="button"
                  onClick={() => confirmDialog.bookingId && confirmDialog.action && handleAction(confirmDialog.bookingId, confirmDialog.action)}
                  className="rounded-lg bg-red-600 px-4 py-2 text-white"
                >
                Yes, {confirmDialog.action}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
