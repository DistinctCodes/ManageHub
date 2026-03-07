"use client";

import { UserPlus, UserCheck } from "lucide-react";

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

export default function ActivityFeed({
  activities,
}: {
  activities: ActivityItem[];
}) {
  if (!activities.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Recent activity
        </h3>
        <p className="text-sm text-gray-400">No recent activity.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        Recent activity
      </h3>
      <div className="space-y-4">
        {activities.slice(0, 6).map((item) => {
          const Icon =
            item.type === "member_verified" ? UserCheck : UserPlus;
          return (
            <div key={item.id} className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5 text-gray-500" />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-gray-700">{item.description}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(item.timestamp).toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
