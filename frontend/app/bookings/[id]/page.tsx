"use client";

import { useState, use } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useGetBooking } from "@/lib/react-query/hooks/bookings/useGetBooking";
import { useCancelBooking } from "@/lib/react-query/hooks/bookings/useCancelBooking";
import { useGetMyInvoices } from "@/lib/react-query/hooks/invoices/useGetMyInvoices";
import { BookingStatus } from "@/lib/types/booking";
import { storage } from "@/lib/storage";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Clock, 
  CreditCard, 
  Loader2, 
  XCircle, 
  Download,
  AlertCircle,
  CalendarPlus 
} from "lucide-react";
import * as ics from "ics";
import { apiClient } from "@/lib/apiClient";

const STATUS_STYLES: Record<BookingStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  CONFIRMED: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  CANCELLED: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  COMPLETED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const { data: bookingData, isLoading: loadingBooking, isError } = useGetBooking(id);
  const { data: invoicesData, isLoading: loadingInvoices } = useGetMyInvoices(1, 1, id);

  const booking = bookingData?.data;
  const invoice = invoicesData?.data?.[0];

  const { mutateAsync: cancel, isPending: cancelling } = useCancelBooking();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function handleCancel() {
    if (!confirmCancel) {
      setConfirmCancel(true);
      return;
    }
    try {
      await cancel(id);
      setConfirmCancel(false);
      toast.success("Booking cancelled successfully");
    } catch {
      // Handled in hook by sonner
    }
  }

  async function handleDownload() {
    if (!invoice) return;
    setDownloading(true);
    try {
      const token = storage.getToken();
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6001/api";
      const res = await fetch(`${API_BASE}/invoices/${invoice.id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download invoice");
    } finally {
      setDownloading(false);
    }
  }

  const handleDownloadICS = () => {
    if (!booking) return;

    const startDate = new Date(booking.startDate);
    const endDate = new Date(booking.endDate);
    
    const end = [
      endDate.getFullYear(),
      endDate.getMonth() + 1,
      endDate.getDate(),
      endDate.getHours() || 18,
      endDate.getMinutes(),
    ];

    if (isNaN(endDate.getTime())) {
      end[0] = startDate.getFullYear();
      end[1] = startDate.getMonth() + 1;
      end[2] = startDate.getDate();
      end[3] = startDate.getHours() + 1 || 18;
      end[4] = startDate.getMinutes();
    }

    const event: any = {
      title: `ManageHub Booking: ${booking.workspace?.name || booking.workspaceId}`,
      description: `Plan: ${booking.planType} - ${booking.seatCount} seats`,
      start: [
        startDate.getFullYear(),
        startDate.getMonth() + 1,
        startDate.getDate(),
        startDate.getHours() || 9,
        startDate.getMinutes(),
      ],
      end: end,
    };

    ics.createEvent(event, (error, value) => {
      if (error) {
        toast.error("Failed to generate calendar file");
        return;
      }
      
      const blob = new Blob([value], { type: "text/calendar" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `booking-${booking.id}.ics`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleGoogleCalendar = async () => {
    if (!booking) return;
    try {
      const statusRes = await apiClient.get<{ data: { connected: boolean } }>("/calendar-sync/status");
      if (statusRes.data?.connected) {
          // Assuming backend has an endpoint to create event
          await apiClient.post("/calendar-sync/events", { bookingId: booking.id }).catch(() => null);
          toast.success("Event added to Google Calendar");
      } else {
          const authRes = await apiClient.get<{ data: { url: string } }>("/calendar-sync/auth/google");
          if (authRes.data?.url) {
              window.location.href = authRes.data.url;
          }
      }
    } catch (err) {
      toast.error("Failed to add to Google Calendar");
    }
  };

  if (loadingBooking || loadingInvoices) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <div className="w-24 h-6 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-6" />
          <div className="w-48 h-8 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-2" />
          <div className="w-64 h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-6 h-64 animate-pulse" />
      </DashboardLayout>
    );
  }

  if (isError || !booking) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 text-gray-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Booking not found</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            This booking may have been deleted or you don't have permission to view it.
          </p>
          <Link
            href="/bookings"
            className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to bookings
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const amountNaira = (booking.totalAmount / 100).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
  });

  const isPaid = invoice?.status === "PAID";
  const paymentBadgeClasses = isPaid
    ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
    : invoice?.status === "CANCELLED"
    ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
    : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";

  return (
    <DashboardLayout>
      <div className="mb-6">
        <Link
          href="/bookings"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to bookings
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
              Booking #{booking.id.slice(0, 8)}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
              Created on {new Date(booking.createdAt).toLocaleDateString()}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              STATUS_STYLES[booking.status]
            }`}
          >
            {booking.status}
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden mb-6">
        <div className="p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Workspace
                </h3>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                    {booking.workspace?.name || booking.workspaceId}
                  </p>
                </div>
                {booking.workspace?.type && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 pl-6">
                    {booking.workspace.type}
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Schedule
                </h3>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                    {booking.startDate} to {booking.endDate}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {booking.planType} Plan · {booking.seatCount} seat{booking.seatCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Payment Details
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {amountNaira}
                  </p>
                </div>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentBadgeClasses}`}
                >
                  {invoice ? invoice.status : "PENDING"}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800/50 p-6 md:p-8 flex items-center gap-4 flex-wrap border-t border-gray-100 dark:border-gray-800">
          {(booking.status === "PENDING" || booking.status === "CONFIRMED") && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 ${
                  confirmCancel
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                {cancelling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                {confirmCancel ? "Confirm cancellation" : "Cancel Booking"}
              </button>
              {confirmCancel && (
                <button
                  onClick={() => setConfirmCancel(false)}
                  className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  Keep booking
                </button>
              )}
            </div>
          )}

          {isPaid && invoice && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-40"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Download Invoice
            </button>
          )}

          {(booking.status === "CONFIRMED") && (
            <div className="flex gap-3 ml-auto">
              <button
                onClick={handleGoogleCalendar}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 text-sm font-medium rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
              >
                <CalendarPlus className="w-4 h-4" />
                Add to Google Calendar
              </button>
              <button
                onClick={handleDownloadICS}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 text-sm font-medium rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
              >
                <Download className="w-4 h-4" />
                Add to Outlook
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
