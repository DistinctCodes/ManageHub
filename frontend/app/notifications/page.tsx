"use client";

import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useGetNotifications } from "@/lib/react-query/hooks/notifications/useGetNotifications";
import { useMarkNotificationRead } from "@/lib/react-query/hooks/notifications/useMarkNotificationRead";
import { useMarkAllRead } from "@/lib/react-query/hooks/notifications/useMarkAllRead";
import { Notification } from "@/lib/types/notification";
import {
  Bell,
  CheckCheck,
  CreditCard,
  BookOpen,
  AlertCircle,
  Info,
} from "lucide-react";

function NotificationIcon({ type }: { type: Notification["type"] }) {
  const cls = "w-4 h-4";
  switch (type) {
    case "PAYMENT_SUCCESS":
      return <CreditCard className={`${cls} text-emerald-600`} />;
    case "PAYMENT_FAILED":
      return <AlertCircle className={`${cls} text-red-500`} />;
    case "BOOKING_CONFIRMED":
      return <BookOpen className={`${cls} text-blue-500`} />;
    case "BOOKING_CANCELLED":
      return <BookOpen className={`${cls} text-orange-500`} />;
    default:
      return <Info className={`${cls} text-gray-400`} />;
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGetNotifications(page, 20);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllRead();

  const notifications = data?.data ?? [];
  const meta = data?.meta;

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {meta?.unreadCount
              ? `${meta.unreadCount} unread`
              : "All caught up"}
          </p>
        </div>
        {(meta?.unreadCount ?? 0) > 0 && (
          <button
            type="button"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 h-20 animate-pulse"
            />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bell className="w-10 h-10 text-gray-200 mb-4" />
          <p className="text-sm font-medium text-gray-500">
            No notifications yet
          </p>
          <p className="text-xs text-gray-400 mt-1">
            You&apos;ll be notified about bookings, payments, and more.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-w-2xl">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`bg-white rounded-xl border p-4 flex items-start gap-3 transition-colors ${
                n.isRead
                  ? "border-gray-100"
                  : "border-gray-200 bg-gray-50/50"
              }`}
            >
              <span className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                <NotificationIcon type={n.type} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{n.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {timeAgo(n.createdAt)}
                </p>
              </div>
              {!n.isRead && (
                <button
                  type="button"
                  onClick={() => markRead.mutate(n.id)}
                  className="shrink-0 text-xs text-gray-400 hover:text-gray-700 transition-colors pt-1"
                  title="Mark as read"
                >
                  <span className="w-2 h-2 rounded-full bg-gray-900 block" />
                </button>
              )}
            </div>
          ))}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-gray-400">
                Page {page} of {meta.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
