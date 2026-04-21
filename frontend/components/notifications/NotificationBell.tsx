"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Bell, CheckCheck, CreditCard, BookOpen, AlertCircle, Info } from "lucide-react";
import { useGetNotifications } from "@/lib/react-query/hooks/notifications/useGetNotifications";
import { useMarkNotificationRead } from "@/lib/react-query/hooks/notifications/useMarkNotificationRead";
import { useMarkAllRead } from "@/lib/react-query/hooks/notifications/useMarkAllRead";
import { Notification } from "@/lib/types/notification";

function NotificationIcon({ type }: { type: Notification["type"] }) {
  const cls = "w-3.5 h-3.5";
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
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useGetNotifications(1, 10);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllRead();

  const notifications = data?.data ?? [];
  const unreadCount = data?.meta?.unreadCount ?? 0;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Bell className="w-8 h-8 text-gray-200 mb-2" />
                <p className="text-xs text-gray-400">No notifications</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-b-0 transition-colors ${
                    n.isRead ? "" : "bg-gray-50/60"
                  }`}
                >
                  <span className="w-6 h-6 rounded-md bg-white border border-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                    <NotificationIcon type={n.type} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 leading-snug">
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {!n.isRead && (
                    <button
                      type="button"
                      onClick={() => markRead.mutate(n.id)}
                      className="shrink-0 pt-1"
                      title="Mark as read"
                    >
                      <span className="w-2 h-2 rounded-full bg-gray-900 block" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 p-2">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-xs text-gray-500 hover:text-gray-900 py-1.5 hover:bg-gray-50 rounded-lg transition-colors"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
