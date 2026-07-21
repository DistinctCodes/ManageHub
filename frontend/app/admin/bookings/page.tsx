"use client";

import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useGetAllBookings } from "@/lib/react-query/hooks/admin/bookings/useGetAllBookings";
import { useUpdateBookingStatus } from "@/lib/react-query/hooks/admin/bookings/useUpdateBookingStatus";
import { BookingStatus } from "@/lib/types/booking";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", { dateStyle: "medium" });
}

function formatNaira(kobo: number): string {
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
    action: "confirm" | "cancel" | "complete";
  } | null>(null);

  const { data, isLoading } = useGetAllBookings(
    page,
    15,
    statusFilter || undefined
  );
  const updateStatus = useUpdateBookingStatus();

  const bookings = data?.data ?? [];
  const meta = data?.meta;

  const handleAction = async (
    id: string,
    action: "confirm" | "cancel" | "complete"
  ) => {
    await updateStatus.mutateAsync({ id, action });
    setConfirmAction(null);
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">All Bookings</h1>
        <p className="text-gray-500 mt-1 text-sm">
          {meta?.total ?? 0} total bookings
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUSES.map(({ value, label }) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              setStatusFilter(value as BookingStatus | "");
              setPage(1);
            }}
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

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 h-20 animate-pulse"
            />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="w-10 h-10 text-gray-200 mb-4" />
          <p className="text-sm font-medium text-gray-500">No bookings found</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
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
                  {bookings.map((b) => (
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
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            STATUS_COLORS[b.status]
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {confirmAction?.id === b.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleAction(b.id, confirmAction.action)
                              }
                              disabled={updateStatus.isPending}
                              className="text-xs px-2.5 py-1 rounded-md bg-gray-900 text-white disabled:opacity-50"
                            >
                              {updateStatus.isPending
                                ? "..."
                                : "Confirm"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmAction(null)}
                              className="text-xs px-2.5 py-1 rounded-md border border-gray-200 text-gray-600"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <select
                            defaultValue=""
                            className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none"
                            onChange={(e) => {
                              const action = e.target.value as
                                | "confirm"
                                | "cancel"
                                | "complete"
                                | "";
                              if (action) {
                                setConfirmAction({ id: b.id, action });
                                e.target.value = "";
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
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
                <p className="text-gray-400">
                  Page {meta.page} of {meta.totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="p-1.5 rounded-md border border-gray-200 disabled:opacity-30 hover:bg-gray-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page >= meta.totalPages}
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
