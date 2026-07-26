"use client";

import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useGetAllBookings } from "@/lib/react-query/hooks/admin/bookings/useGetAllBookings";
import { useUpdateBookingStatus } from "@/lib/react-query/hooks/admin/bookings/useUpdateBookingStatus";
import { BookingStatus } from "@/lib/types/booking";
import { AlertTriangle, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";

type ActionType = "confirm" | "cancel" | "complete";

const STATUSES: { value: BookingStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const STATUS_COLORS: Record<BookingStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-emerald-50 text-emerald-600",
  CANCELLED: "bg-red-50 text-red-600",
};

// Destructive actions get a visually distinct confirm button so an admin
// doesn't accidentally treat "Cancel" the same as "Confirm"/"Complete".
const DESTRUCTIVE_ACTIONS: ActionType[] = ["cancel"];

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-NG", { dateStyle: "medium" });
}

function formatNaira(kobo: number): string {
  if (typeof kobo !== "number" || Number.isNaN(kobo)) return "—";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(kobo / 100);
}

export default function AdminBookingsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "">("");
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    action: ActionType;
  } | null>(null);
  // Tracks exactly which booking row is currently being mutated, so other
  // rows stay interactive and only the affected row shows a loading state.
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useGetAllBookings(page, 15, statusFilter || undefined);
  const updateStatus = useUpdateBookingStatus();

  const bookings = data?.data ?? [];
  const meta = data?.meta;

  const handleFilterChange = (value: BookingStatus | "") => {
    setStatusFilter(value);
    setPage(1);
    setConfirmAction(null);
  };

  const handleAction = async (id: string, action: ActionType) => {
    setActionError(null);
    setPendingId(id);
    try {
      await updateStatus.mutateAsync({ id, action });
      setConfirmAction(null);
    } catch (err) {
      // Keep confirmAction open so the admin can retry without re-selecting
      // the action from the dropdown.
      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to update booking status. Please try again."
      );
    } finally {
      setPendingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">All Bookings</h1>
        <p className="text-gray-500 mt-1 text-sm">
          {meta?.total ?? 0} total booking{meta?.total === 1 ? "" : "s"}
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap" role="tablist" aria-label="Filter bookings by status">
        {STATUSES.map(({ value, label }) => (
          <button
            key={value || "all"}
            type="button"
            role="tab"
            aria-selected={statusFilter === value}
            onClick={() => handleFilterChange(value as BookingStatus | "")}
            className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              statusFilter === value
                ? "bg-gray-900 text-white border-gray-900"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {actionError && (
        <div
          role="alert"
          className="mb-4 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="ml-auto text-xs font-medium underline underline-offset-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 h-20 animate-pulse"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertTriangle className="w-10 h-10 text-red-200 mb-4" />
          <p className="text-sm font-medium text-gray-700">
            Couldn&apos;t load bookings
          </p>
          <p className="text-xs text-gray-400 mt-1 mb-4">
            {error instanceof Error ? error.message : "Something went wrong."}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-xs px-3 py-1.5 rounded-md bg-gray-900 text-white"
          >
            Retry
          </button>
        </div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="w-10 h-10 text-gray-200 mb-4" />
          <p className="text-sm font-medium text-gray-500">No bookings found</p>
        </div>
      ) : (
        <>
          <div
            className={`bg-white rounded-xl border border-gray-100 overflow-hidden transition-opacity ${
              isFetching ? "opacity-60" : "opacity-100"
            }`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-50">
                    <th className="px-5 py-3 font-medium">Booking ID</th>
                    <th className="px-5 py-3 font-medium">Workspace</th>
                    <th className="px-5 py-3 font-medium">Plan</th>
                    <th className="px-5 py-3 font-medium">Dates</th>
                    <th className="px-5 py-3 font-medium">Amount</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => {
                    const isRowPending = pendingId === b.id;
                    const isConfirmingThisRow = confirmAction?.id === b.id;
                    const statusColor =
                      STATUS_COLORS[b.status] ?? "bg-gray-50 text-gray-600";

                    return (
                      <tr
                        key={b.id}
                        className="border-b border-gray-50 last:border-0"
                      >
                        <td className="px-5 py-3.5 text-gray-500 font-mono text-xs">
                          {b.id.slice(0, 8)}
                        </td>
                        <td className="px-5 py-3.5 text-gray-700">
                          {b.workspace?.name ?? (
                            <span className="text-gray-400 text-xs">
                              {b.workspaceId.slice(0, 8)}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-gray-600 capitalize">
                          {b.planType.toLowerCase()} × {b.seatCount}
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                          {formatDate(b.startDate)} → {formatDate(b.endDate)}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-gray-900">
                          {formatNaira(b.totalAmount)}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {isConfirmingThisRow ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleAction(b.id, confirmAction.action)
                                }
                                disabled={isRowPending}
                                aria-label={`Confirm ${confirmAction.action} for booking ${b.id.slice(0, 8)}`}
                                className={`text-xs px-2.5 py-1 rounded-md text-white disabled:opacity-50 ${
                                  DESTRUCTIVE_ACTIONS.includes(
                                    confirmAction.action
                                  )
                                    ? "bg-red-600"
                                    : "bg-gray-900"
                                }`}
                              >
                                {isRowPending ? "..." : "Confirm"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmAction(null)}
                                disabled={isRowPending}
                                className="text-xs px-2.5 py-1 rounded-md border border-gray-200 text-gray-600 disabled:opacity-50"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <select
                              // Fully controlled (always resets to "") instead
                              // of mutating e.target.value directly, which
                              // fights React's controlled/uncontrolled model.
                              value=""
                              aria-label={`Choose action for booking ${b.id.slice(0, 8)}`}
                              disabled={isRowPending}
                              className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none disabled:opacity-50"
                              onChange={(e) => {
                                const action = e.target.value as ActionType | "";
                                if (action) {
                                  setActionError(null);
                                  setConfirmAction({ id: b.id, action });
                                }
                              }}
                            >
                              <option value="" disabled>
                                Action
                              </option>
                              {b.status === "PENDING" && (
                                <option value="confirm">Confirm</option>
                              )}
                              {b.status === "CONFIRMED" && (
                                <option value="complete">Complete</option>
                              )}
                              {(b.status === "PENDING" ||
                                b.status === "CONFIRMED") && (
                                <option value="cancel">Cancel</option>
                              )}
                            </select>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
                <p className="text-gray-400" aria-live="polite">
                  Page {meta.page} of {meta.totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    aria-label="Previous page"
                    disabled={page <= 1 || isFetching}
                    onClick={() => setPage((p) => p - 1)}
                    className="p-1.5 rounded-md border border-gray-200 disabled:opacity-30 hover:bg-gray-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    aria-label="Next page"
                    disabled={page >= meta.totalPages || isFetching}
                    onClick={() => setPage((p) => p + 1)}
                    className="p-1.5 rounded-md border border-gray-200 disabled:opacity-30 hover:bg-gray-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}