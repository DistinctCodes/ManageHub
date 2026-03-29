"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  AdminAnalytics,
  useGetAdminAnalytics,
} from "@/lib/hooks/admin/analytics/useGetAdminAnalytics";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatNaira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-base font-semibold uppercase tracking-widest text-gray-400">
      {children}
    </h2>
  );
}

function RevenueChart({
  trend,
}: {
  trend: AdminAnalytics["revenue"]["trend"];
}) {
  const max = Math.max(...trend.map((m) => m.revenueKobo), 1);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <SectionTitle>Revenue Trend (6 months)</SectionTitle>
      <div className="flex h-40 items-end gap-3">
        {trend.map((m) => {
          const pct = Math.round((m.revenueKobo / max) * 100);
          return (
            <div
              key={m.month}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <div
                className="w-full rounded-t-md bg-indigo-500 transition-all"
                style={{ height: `${pct}%`, minHeight: pct > 0 ? "4px" : "0" }}
              />
              <span className="text-[10px] text-gray-400">{m.month}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="h-24 animate-pulse rounded-xl border border-gray-100 bg-gray-100" />
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState<string | undefined>();
  const [appliedTo, setAppliedTo] = useState<string | undefined>();

  const {
    data: analytics,
    isLoading,
    refetch,
  } = useGetAdminAnalytics({
    from: appliedFrom,
    to: appliedTo,
  });

  function handleApply() {
    setAppliedFrom(from || undefined);
    setAppliedTo(to || undefined);
  }

  function handleClear() {
    setFrom("");
    setTo("");
    setAppliedFrom(undefined);
    setAppliedTo(undefined);
  }

  const totalBookings = analytics
    ? Object.values(analytics.bookings.byStatus).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-8 p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>

          {/* Date filter */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="From"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="To"
            />
            <button
              onClick={handleApply}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Apply
            </button>
            <button
              onClick={handleClear}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Clear
            </button>
            <button
              onClick={() => refetch()}
              className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !analytics && (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <p className="text-gray-400">No analytics data available.</p>
          </div>
        )}

        {/* Data */}
        {!isLoading && analytics && (
          <>
            {/* Revenue */}
            <section>
              <SectionTitle>Revenue</SectionTitle>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard
                  label="Total Revenue"
                  value={formatNaira(analytics.revenue.totalKobo)}
                />
                <StatCard
                  label="This Month"
                  value={formatNaira(analytics.revenue.thisMonthKobo)}
                />
                <StatCard
                  label="Last Month"
                  value={formatNaira(analytics.revenue.lastMonthKobo)}
                />
                <StatCard
                  label="Invoices Paid"
                  value={analytics.invoices.paid}
                  sub={`of ${analytics.invoices.total} total`}
                />
              </div>
            </section>

            {/* Bookings */}
            <section>
              <SectionTitle>Bookings</SectionTitle>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard label="Total" value={totalBookings} />
                <StatCard
                  label="Pending"
                  value={analytics.bookings.byStatus["PENDING"] ?? 0}
                />
                <StatCard
                  label="Confirmed"
                  value={analytics.bookings.byStatus["CONFIRMED"] ?? 0}
                />
                <StatCard
                  label="Completed"
                  value={analytics.bookings.byStatus["COMPLETED"] ?? 0}
                />
              </div>
            </section>

            {/* Occupancy */}
            <section>
              <SectionTitle>Occupancy</SectionTitle>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <StatCard
                  label="Occupancy Rate"
                  value={`${analytics.occupancy.rate}%`}
                />
                <StatCard
                  label="Occupied Seats"
                  value={analytics.occupancy.occupiedSeats}
                  sub={`of ${analytics.occupancy.totalSeats} total seats`}
                />
                <StatCard
                  label="Active Workspaces"
                  value={analytics.occupancy.activeWorkspaces}
                />
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{
                    width: `${Math.min(analytics.occupancy.rate, 100)}%`,
                  }}
                />
              </div>
            </section>

            {/* Revenue trend chart */}
            {analytics.revenue.trend.length > 0 && (
              <RevenueChart trend={analytics.revenue.trend} />
            )}

            {/* Top workspaces + top members */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {analytics.topWorkspaces.length > 0 && (
                <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <SectionTitle>Top Workspaces</SectionTitle>
                  <ol className="space-y-3">
                    {analytics.topWorkspaces.map((ws, idx) => (
                      <li
                        key={ws.id}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-medium text-gray-800">
                            {ws.name}
                          </span>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <div>{Number(ws.bookingCount)} bookings</div>
                          <div className="font-medium text-gray-700">
                            {formatNaira(Number(ws.totalRevenue))}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {analytics.topMembers.length > 0 && (
                <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <SectionTitle>Top Members</SectionTitle>
                  <ol className="space-y-3">
                    {analytics.topMembers.map((member, idx) => (
                      <li
                        key={member.id}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-medium text-gray-800">
                            {member.fullName}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {formatNaira(Number(member.totalSpend))}
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
