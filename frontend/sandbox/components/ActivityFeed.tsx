"use client";
import { useState } from "react";
import { ReactNode } from "react";
import { CalendarPlus, LogIn, LogOut, Receipt, CalendarX } from "lucide-react";

export type ActivityType =
  | "booking_created"
  | "checkin"
  | "checkout"
  | "invoice_paid"
  | "booking_cancelled";

export interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: string | Date;
  icon?: ReactNode;
}

const TYPE_ICONS: Record<ActivityType, ReactNode> = {
  booking_created: <CalendarPlus className="w-4 h-4" />,
  checkin: <LogIn className="w-4 h-4" />,
  checkout: <LogOut className="w-4 h-4" />,
  invoice_paid: <Receipt className="w-4 h-4" />,
  booking_cancelled: <CalendarX className="w-4 h-4" />,
};

const TYPE_COLORS: Record<ActivityType, string> = {
  booking_created: "bg-blue-100 text-blue-600",
  checkin: "bg-green-100 text-green-600",
  checkout: "bg-gray-100 text-gray-600",
  invoice_paid: "bg-purple-100 text-purple-600",
  booking_cancelled: "bg-red-100 text-red-600",
};

function relativeTime(ts: string | Date): string {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

const PAGE_SIZE = 5;

interface ActivityFeedProps {
  activities: Activity[];
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  const [visible, setVisible] = useState(PAGE_SIZE);

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-gray-400">
        <CalendarX className="w-8 h-8 mb-2" />
        <p className="text-sm">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.slice(0, visible).map((a) => (
        <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
          <span className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${TYPE_COLORS[a.type]}`}>
            {a.icon ?? TYPE_ICONS[a.type]}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-800">{a.description}</p>
            <p className="text-xs text-gray-400 mt-0.5">{relativeTime(a.timestamp)}</p>
          </div>
        </div>
      ))}
      {visible < activities.length && (
        <button
          onClick={() => setVisible((v) => v + PAGE_SIZE)}
          className="w-full mt-2 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Load more
        </button>
      )}
    </div>
  );
}
