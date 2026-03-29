"use client";

import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  useGetNotifications,
  useMarkAllRead,
  useMarkNotificationRead,
} from "@/lib/react-query/hooks";
import { Notification } from "@/lib/types/notification";

const PAGE_SIZE = 10;

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.round((date.getTime() - now.getTime()) / 1000);

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ];

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  for (const [unit, secondsInUnit] of units) {
    if (Math.abs(diffInSeconds) >= secondsInUnit || unit === "second") {
      return formatter.format(
        Math.round(diffInSeconds / secondsInUnit),
        unit
      );
    }
  }

  return "just now";
}

function NotificationSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5"
        >
          <div className="mb-3 h-4 w-40 rounded bg-gray-200" />
          <div className="mb-2 h-3 w-full rounded bg-gray-100" />
          <div className="mb-4 h-3 w-5/6 rounded bg-gray-100" />
          <div className="h-3 w-28 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-gray-300 bg-white/80 px-6 py-14 text-center">
      <h2 className="text-lg font-semibold text-gray-900">
        No notifications yet
      </h2>
      <p className="mt-2 text-sm text-gray-500">
        When activity happens across your workspace, your full history will show
        up here.
      </p>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Previous
      </button>
      <p className="text-sm text-gray-500">
        Page {page} of {totalPages}
      </p>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}

function NotificationRow({
  notification,
  onMarkAsRead,
  isMarkingRead,
}: {
  notification: Notification;
  onMarkAsRead: (notificationId: string) => void;
  isMarkingRead: boolean;
}) {
  return (
    <article
      className={`rounded-2xl border p-5 transition ${
        notification.isRead
          ? "border-gray-200 bg-white"
          : "border-amber-200 bg-amber-50/80"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            {!notification.isRead && (
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
            )}
            <h2
              className={`text-base text-gray-900 ${
                notification.isRead ? "font-medium" : "font-semibold"
              }`}
            >
              {notification.title}
            </h2>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-600">
            {notification.message}
          </p>
          <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
            {formatRelativeTime(notification.createdAt)}
          </p>
        </div>

        {!notification.isRead && (
          <button
            type="button"
            onClick={() => onMarkAsRead(notification.id)}
            disabled={isMarkingRead}
            className="shrink-0 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isMarkingRead ? "Marking..." : "Mark as read"}
          </button>
        )}
      </div>
    </article>
  );
}

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const notificationsQuery = useGetNotifications(page, PAGE_SIZE);
  const markNotificationRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();

  const notifications = notificationsQuery.data?.data ?? [];
  const meta = notificationsQuery.data?.meta;
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;

  return (
    <DashboardLayout>
      <section className="space-y-6">
        <div className="flex flex-col gap-4 rounded-[28px] border border-gray-200 bg-white px-6 py-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-600">
              Notification Center
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">
              All notifications
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Review your full notification history and clear unread updates
              when you are done.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-gray-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {markAllRead.isPending ? "Marking all..." : "Mark all as read"}
            </button>
          )}
        </div>

        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-gray-500">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
              : "Everything is up to date"}
          </p>
          {meta && meta.total > 0 && (
            <p className="text-sm text-gray-400">
              Showing {(meta.page - 1) * meta.limit + 1}-
              {Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
            </p>
          )}
        </div>

        {notificationsQuery.isLoading ? (
          <NotificationSkeleton />
        ) : notificationsQuery.isError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {notificationsQuery.error instanceof Error
              ? notificationsQuery.error.message
              : "Unable to load notifications right now."}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onMarkAsRead={(notificationId) =>
                  markNotificationRead.mutate(notificationId)
                }
                isMarkingRead={
                  markNotificationRead.isPending &&
                  markNotificationRead.variables === notification.id
                }
              />
            ))}
          </div>
        )}

        <Pagination
          page={page}
          totalPages={meta?.totalPages ?? 1}
          onPageChange={setPage}
        />
      </section>
    </DashboardLayout>
  );
}
