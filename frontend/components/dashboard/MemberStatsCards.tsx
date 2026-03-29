"use client";

import { Calendar, DollarSign, FileText, Clock } from "lucide-react";
import { useGetMemberDashboard } from "@/lib/react-query/hooks/dashboard/useGetMemberDashboard";

export default function MemberStatsCards() {
  const { data, isLoading } = useGetMemberDashboard();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-5 border border-gray-100 animate-pulse"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-gray-50" />
            </div>
            <div className="h-8 bg-gray-100 rounded w-16 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-20" />
          </div>
        ))}
      </div>
    );
  }

  const stats = data?.data.stats;

  // Format currency from kobo to naira
  const formatCurrency = (kobo: number) => {
    const naira = kobo / 100;
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(naira);
  };

  // Format date for last check-in
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const cards = [
    {
      icon: Calendar,
      label: "Active Bookings",
      value: stats?.activeBookings ?? 0,
    },
    {
      icon: DollarSign,
      label: "Total Spent",
      value: formatCurrency(stats?.totalSpentKobo ?? 0),
    },
    {
      icon: FileText,
      label: "Invoices",
      value: stats?.invoiceCount ?? 0,
    },
    {
      icon: Clock,
      label: "Last Check-in",
      value: formatDate(stats?.lastCheckIn ?? null),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white rounded-xl p-5 border border-gray-100"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center">
                <Icon className="w-4 h-4 text-gray-500" />
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-400 mt-1">{card.label}</p>
          </div>
        );
      })}
    </div>
  );
}
