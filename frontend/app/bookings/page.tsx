"use client";

import { useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useGetMyBookings } from "@/lib/react-query/hooks/bookings/useGetMyBookings";
import { useCancelBooking } from "@/lib/react-query/hooks/bookings/useCancelBooking";
import { useInitializePayment } from "@/lib/react-query/hooks/payments/useInitializePayment";
import { Booking, BookingStatus } from "@/lib/types/booking";
import {
  CalendarPlus,
  BookOpen,
  Loader2,
  CreditCard,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_STYLES: Record<BookingStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-600",
  COMPLETED: "bg-gray-100 text-gray-600",
};

declare global {
  interface Window {
    PaystackPop: {
      setup: (opts: {
        key: string;
        email: string;
        amount: number;
        ref: string;
        onClose: () => void;
        callback: (response: { reference: string }) => void;
      }) => { openIframe: () => void };
    };
  }
}

function BookingRow({ booking, onCancelled }: { booking: Booking; onCancelled: () => void }) {
  const { mutateAsync: cancel, isPending: cancelling } = useCancelBooking();
  const { mutateAsync: initPayment, isPending: paying } = useInitializePayment();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const amountNaira = (booking.totalAmount / 100).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
  });

  async function handleCancel() {
    if (!confirmCancel) { setConfirmCancel(true); return; }
    await cancel(booking.id);
    setConfirmCancel(false);
    onCancelled();
  }

  async function handlePay() {
    try {
      const res = await initPayment(booking.id);
      const { authorizationUrl, reference, accessCode } = res.data;

      if (!window.PaystackPop) {
        window.location.href = authorizationUrl;
        return;
      }
      void accessCode;
      const handler = window.PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
        email: "",
        amount: booking.totalAmount,
        ref: reference,
        onClose: () => toast.info("Payment window closed"),
        callback: () => {
          toast.success("Payment submitted! Booking will be confirmed shortly.");
          onCancelled(); // trigger refetch
        },
      });
      handler.openIframe();
    } catch {
      // handled in hook
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                STATUS_STYLES[booking.status]
              }`}
            >
              {booking.status}
            </span>
            <span className="text-xs text-gray-400 font-mono">
              #{booking.id.slice(0, 8)}
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-900 mt-1.5">
            {booking.workspace?.name ?? booking.workspaceId}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {booking.planType} · {booking.seatCount} seat
            {booking.seatCount !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {booking.startDate} → {booking.endDate}
          </p>
        </div>

        <div className="text-right shrink-0">
          <p className="text-base font-bold text-gray-900">{amountNaira}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(booking.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Actions */}
      {(booking.status === "PENDING" || booking.status === "CONFIRMED") && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
          {booking.status === "PENDING" && (
            <button
              onClick={handlePay}
              disabled={paying}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-40"
            >
              {paying ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CreditCard className="w-3.5 h-3.5" />
              )}
              Pay now
            </button>
          )}
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-40 ${
              confirmCancel
                ? "bg-red-600 text-white hover:bg-red-700"
                : "border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {cancelling ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <XCircle className="w-3.5 h-3.5" />
            )}
            {confirmCancel ? "Confirm cancel?" : "Cancel"}
          </button>
          {confirmCancel && (
            <button
              onClick={() => setConfirmCancel(false)}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
            >
              Keep
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function MyBookingsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useGetMyBookings(page, 10);

  const bookings = data?.data ?? [];
  const meta = data?.meta;

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-500 mt-1 text-sm">
            View and manage your workspace reservations.
          </p>
        </div>
        <Link
          href="/workspaces"
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors shrink-0"
        >
          <CalendarPlus className="w-4 h-4" />
          New booking
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 h-32 animate-pulse"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-16 text-gray-500">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Failed to load bookings</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No bookings yet</p>
          <p className="text-sm mt-1">
            Browse workspaces to make your first booking.
          </p>
          <Link
            href="/workspaces"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700"
          >
            <CalendarPlus className="w-4 h-4" />
            Browse workspaces
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {bookings.map((booking) => (
              <BookingRow
                key={booking.id}
                booking={booking}
                onCancelled={() => refetch()}
              />
            ))}
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-8">
              <p className="text-sm text-gray-500">
                {meta.total} booking{meta.total !== 1 ? "s" : ""} total
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(meta.totalPages, p + 1))
                  }
                  disabled={page === meta.totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
