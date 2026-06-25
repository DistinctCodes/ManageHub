"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  wsUrl?: string;
}

export function NotificationBadge({ wsUrl }: Props) {
  const [count, setCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!wsUrl) return;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as { type?: string };
        if (data.type === "notification") {
          setCount((c) => c + 1);
        }
      } catch {
        setCount((c) => c + 1);
      }
    };

    return () => {
      ws.close();
    };
  }, [wsUrl]);

  const handleClick = () => setCount(0);

  return (
    <button
      onClick={handleClick}
      aria-label={`Notifications${count > 0 ? `, ${count} unread` : ""}`}
      className="relative inline-flex items-center rounded-full p-2 hover:bg-gray-100 transition-colors"
    >
      {/* Bell icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6 text-gray-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>

      {count > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
