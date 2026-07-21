"use client";

import { Users, Building2, MonitorCheck, TrendingUp } from "lucide-react";

interface Stats {
  totalMembers: number;
  verifiedMembers: number;
  activeWorkspaces: number;
  deskOccupancy: number;
}

const icons = [Users, Building2, MonitorCheck, TrendingUp];
const labels = ["Total members", "Verified", "Workspaces", "Occupancy"];

export default function StatsCards({ stats }: { stats: Stats | null }) {
  const values = stats
    ? [
        stats.totalMembers,
        stats.verifiedMembers,
        stats.activeWorkspaces,
        `${stats.deskOccupancy}%`,
      ]
    : ["—", "—", "—", "—"];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {labels.map((label, i) => {
        const Icon = icons[i];
        return (
          <div
            key={label}
            className="bg-white rounded-xl p-5 border border-gray-100"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center">
                <Icon className="w-4 h-4 text-gray-500" />
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{values[i]}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        );
      })}
    </div>
  );
}
