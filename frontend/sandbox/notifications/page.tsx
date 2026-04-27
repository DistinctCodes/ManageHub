"use client";
import { useEffect, useRef, useState } from "react";

interface Notification {
  id: number;
  title: string;
  body: string;
  read: boolean;
  timestamp: string;
}

const ALL_NOTIFICATIONS: Notification[] = Array.from({ length: 60 }, (_, i) => ({
  id: i + 1,
  title: ["Booking confirmed", "Invoice due", "Check-in reminder", "New message", "Workspace update"][i % 5],
  body: `Notification #${i + 1} — ${["Your booking has been confirmed.", "An invoice is due for payment.", "Don't forget your check-in today.", "You have a new message.", "A workspace you follow was updated."][i % 5]}`,
  read: i % 3 === 0,
  timestamp: new Date(Date.now() - i * 3600_000).toISOString(),
}));

const PAGE_SIZE = 20;

function fetchPage(page: number): Promise<Notification[]> {
  return new Promise((resolve) =>
    setTimeout(() => {
      const start = page * PAGE_SIZE;
      resolve(ALL_NOTIFICATIONS.slice(start, start + PAGE_SIZE));
    }, 600)
  );
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  async function loadMore() {
    if (loading || done) return;
    setLoading(true);
    const next = await fetchPage(page);
    if (next.length < PAGE_SIZE) setDone(true);
    setItems((prev) => [...prev, ...next]);
    setPage((p) => p + 1);
    setLoading(false);
  }

  // Initial load
  useEffect(() => { loadMore(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadMore();
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, done, page]); // eslint-disable-line react-hooks/exhaustive-deps

  function markRead(id: number) {
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">Notifications</h1>
      <div className="space-y-2">
        {items.map((n) => (
          <div
            key={n.id}
            onClick={() => markRead(n.id)}
            className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50 ${!n.read ? "border-l-4 border-l-blue-500 border-gray-100 bg-blue-50/30" : "border-gray-100"}`}
          >
            <div className="flex justify-between items-start gap-2">
              <p className={`text-sm font-medium ${!n.read ? "text-gray-900" : "text-gray-600"}`}>{n.title}</p>
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {new Date(n.timestamp).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{n.body}</p>
          </div>
        ))}
      </div>

      {/* Sentinel for IntersectionObserver */}
      <div ref={sentinelRef} className="h-4" />

      {loading && (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {done && !loading && (
        <p className="text-center text-sm text-gray-400 py-6">You&apos;re all caught up 🎉</p>
      )}
    </div>
  );
}
