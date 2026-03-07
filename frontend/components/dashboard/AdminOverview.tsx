"use client";

import {
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Mail,
  MailCheck,
  TrendingUp,
} from "lucide-react";

interface AdminStats {
  users: {
    total: number;
    active: number;
    suspended: number;
    newThisMonth: number;
  };
  newsletter: {
    total: number;
    verified: number;
    active: number;
    newThisMonth: number;
    confirmationRate: number;
  };
  registrationTrend: { month: string; count: number }[];
}

export default function AdminOverview({ stats }: { stats: AdminStats | null }) {
  if (!stats) return null;

  const cards = [
    {
      label: "Total users",
      value: stats.users.total,
      icon: Users,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Active users",
      value: stats.users.active,
      icon: UserCheck,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Suspended",
      value: stats.users.suspended,
      icon: UserX,
      color: "bg-red-50 text-red-600",
    },
    {
      label: "New this month",
      value: stats.users.newThisMonth,
      icon: UserPlus,
      color: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* System stats */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          System overview
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <div
              key={c.label}
              className="bg-white rounded-xl p-5 border border-gray-100"
            >
              <span
                className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${c.color}`}
              >
                <c.icon className="w-4 h-4" />
              </span>
              <p className="text-2xl font-bold text-gray-900">{c.value}</p>
              <p className="text-xs text-gray-400 mt-1">{c.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Newsletter stats */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Newsletter
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-xs text-gray-400">Subscribers</p>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {stats.newsletter.total}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MailCheck className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-xs text-gray-400">Verified</p>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {stats.newsletter.verified}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-xs text-gray-400">Confirmation rate</p>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {stats.newsletter.confirmationRate}%
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <UserPlus className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-xs text-gray-400">New this month</p>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {stats.newsletter.newThisMonth}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
