"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { apiClient } from "@/lib/apiClient";

export default function AnnouncementsBadge() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;
    apiClient
      .get<{ count: number }>("/announcements/unread-count")
      .then((res) => {
        if (active) setUnreadCount(res.count);
      })
      .catch(() => {
        // announcements module may not be deployed yet
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="relative">
      <Megaphone className="w-5 h-5 text-gray-600" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </div>
  );
}
