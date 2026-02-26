"use client";

import React from "react";
import { Users, UserCheck, Building2, TrendingUp, LucideIcon } from "lucide-react";

export interface StatsCardsProps {
  data?: {
    totalMembers: number;
    verifiedUsers: number;
    activeWorkspaces: number;
    occupancyRate: number;
  };
}

interface StatCard {
  label: string;
  value: number | string;
  icon: LucideIcon;
  iconBgColor: string;
  iconColor: string;
}

export function StatsCards({ data }: StatsCardsProps) {
  const stats: StatCard[] = [
    {
      label: "Total Members",
      value: data?.totalMembers ?? 0,
      icon: Users,
      iconBgColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Verified Users",
      value: data?.verifiedUsers ?? 0,
      icon: UserCheck,
      iconBgColor: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      label: "Active Workspaces",
      value: data?.activeWorkspaces ?? 0,
      icon: Building2,
      iconBgColor: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      label: "Occupancy Rate",
      value: data?.occupancyRate !== undefined ? `${data.occupancyRate}%` : "0%",
      icon: TrendingUp,
      iconBgColor: "bg-amber-50",
      iconColor: "text-amber-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
        >
          {data === undefined ? (
            <SkeletonCard />
          ) : (
            <>
              <div className="flex items-center gap-4 mb-4">
                <div className={`${stat.iconBgColor} p-3 rounded-lg`}>
                  <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
                <h4 className="text-gray-500 font-medium">{stat.label}</h4>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="bg-gray-200 p-3 rounded-lg w-12 h-12" />
        <div className="h-4 bg-gray-200 rounded w-24" />
      </div>
      <div className="h-8 bg-gray-200 rounded w-16" />
    </div>
  );
}
