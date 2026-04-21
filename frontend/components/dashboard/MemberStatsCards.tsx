"use client";

import { BookOpen, CreditCard, FileText, Clock } from "lucide-react";
import { useGetMemberDashboard } from "@/lib/react-query/hooks/dashboard/useGetMemberDashboard";

function formatNaira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(kobo / 100);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NG", {
    dateStyle: "medium",
  });
}

export default function MemberStatsCards() {
  const { data, isLoading } = useGetMemberDashboard();
  const stats = data?.data?.stats;

  const cards = [
    {
      label: "Active bookings",
      value: isLoading ? "…" : (stats?.activeBookings ?? 0).toString(),
      icon: BookOpen,
    },
    {
      label: "Total spent",
      value: isLoading ? "…" : formatNaira(stats?.totalSpent ?? 0),
      icon: CreditCard,
    },
    {
      label: "Invoices",
      value: isLoading ? "…" : (stats?.invoiceCount ?? 0).toString(),
      icon: FileText,
    },
    {
      label: "Last check-in",
      value: isLoading ? "…" : formatDate(stats?.lastCheckIn ?? null),
      icon: Clock,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="bg-white rounded-xl p-5 border border-gray-100"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center">
              <Icon className="w-4 h-4 text-gray-500" />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 truncate">{value}</p>
          <p className="text-xs text-gray-400 mt-1">{label}</p>
        </div>
      ))}
    </div>
  );
}
