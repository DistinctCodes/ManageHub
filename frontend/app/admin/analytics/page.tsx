"use client";

import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useGetAdminAnalytics } from "@/lib/react-query/hooks/admin/analytics/useGetAdminAnalytics";
import {
  TrendingUp,
  BookOpen,
  Users,
  FileText,
  MonitorCheck,
  RefreshCw,
  Trophy,
} from "lucide-react";

function formatNaira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    notation: kobo >= 100_000_000 ? "compact" : "standard",
  }).format(kobo / 100);
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "bg-gray-50 text-gray-500",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100">
      <span
        className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}
      >
        <Icon className="w-4 h-4" />
      </span>
      <p className="text-2xl font-bold text-gray-900 truncate">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState<string | undefined>();
  const [appliedTo, setAppliedTo] = useState<string | undefined>();

  const { data, isLoading, refetch } = useGetAdminAnalytics(
    appliedFrom,
    appliedTo
  );

  const analytics = data?.data;

  const applyFilter = () => {
    setAppliedFrom(from || undefined);
    setAppliedTo(to || undefined);
  };

  const clearFilter = () => {
    setFrom("");
    setTo("");
    setAppliedFrom(undefined);
    setAppliedTo(undefined);
  };

  // Derive booking totals from byStatus map
  const bookingsByStatus = analytics?.bookings.byStatus ?? {};
  const totalBookings = Object.values(bookingsByStatus).reduce(
    (sum, n) => sum + n,
    0
  );

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Platform-wide business intelligence
          </p>
        </div>

        {/* Date filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
          <button
            type="button"
            onClick={applyFilter}
            className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Apply
          </button>
          {(appliedFrom || appliedTo) && (
            <button
              type="button"
              onClick={clearFilter}
              className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => refetch()}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 h-32 animate-pulse"
            />
          ))}
        </div>
      ) : !analytics ? (
        <p className="text-sm text-gray-400 py-20 text-center">
          No analytics data available.
        </p>
      ) : (
        <div className="space-y-8">
          {/* Revenue */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Revenue
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total revenue"
                value={formatNaira(analytics.revenue.total)}
                icon={TrendingUp}
                color="bg-emerald-50 text-emerald-600"
              />
              <StatCard
                label="This month"
                value={formatNaira(analytics.revenue.thisMonth)}
                icon={TrendingUp}
                color="bg-blue-50 text-blue-600"
              />
              <StatCard
                label="Last month"
                value={formatNaira(analytics.revenue.lastMonth)}
                icon={TrendingUp}
                color="bg-gray-50 text-gray-500"
              />
              <StatCard
                label="Invoices paid"
                value={analytics.invoices.paid.toString()}
                sub={`of ${analytics.invoices.total} total`}
                icon={FileText}
                color="bg-purple-50 text-purple-600"
              />
            </div>
          </section>

          {/* Bookings */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Bookings
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total"
                value={totalBookings.toString()}
                icon={BookOpen}
                color="bg-gray-50 text-gray-500"
              />
              <StatCard
                label="Pending"
                value={(bookingsByStatus["PENDING"] ?? 0).toString()}
                icon={BookOpen}
                color="bg-amber-50 text-amber-600"
              />
              <StatCard
                label="Confirmed"
                value={(bookingsByStatus["CONFIRMED"] ?? 0).toString()}
                icon={BookOpen}
                color="bg-blue-50 text-blue-600"
              />
              <StatCard
                label="Completed"
                value={(bookingsByStatus["COMPLETED"] ?? 0).toString()}
                icon={BookOpen}
                color="bg-emerald-50 text-emerald-600"
              />
            </div>
          </section>

          {/* Occupancy */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Live occupancy
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                label="Occupancy rate"
                value={`${analytics.occupancy.occupancyPercent}%`}
                icon={MonitorCheck}
                color="bg-blue-50 text-blue-600"
              />
              <StatCard
                label="Occupied seats"
                value={analytics.occupancy.occupiedSeats.toString()}
                sub={`of ${analytics.occupancy.totalSeats} total seats`}
                icon={Users}
                color="bg-emerald-50 text-emerald-600"
              />
              <StatCard
                label="Active workspaces"
                value={analytics.occupancy.activeWorkspaces.toString()}
                icon={MonitorCheck}
                color="bg-gray-50 text-gray-500"
              />
            </div>

            {/* Occupancy bar */}
            <div className="mt-3 bg-white border border-gray-100 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">Seat utilisation</span>
                <span className="text-xs font-medium text-gray-700">
                  {analytics.occupancy.occupiedSeats} /{" "}
                  {analytics.occupancy.totalSeats}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gray-900 h-2.5 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, analytics.occupancy.occupancyPercent)}%`,
                  }}
                />
              </div>
            </div>
          </section>

          {/* Revenue trend */}
          {analytics.revenue.trend.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Revenue trend (last 6 months)
              </h2>
              <div className="bg-white border border-gray-100 rounded-xl p-5">
                <div className="flex items-end gap-3 h-32">
                  {(() => {
                    const max = Math.max(
                      ...analytics.revenue.trend.map((t) => t.totalKobo),
                      1
                    );
                    return analytics.revenue.trend.map((t) => (
                      <div
                        key={t.month}
                        className="flex-1 flex flex-col items-center gap-1"
                        title={formatNaira(t.totalKobo)}
                      >
                        <div
                          className="w-full bg-gray-900 rounded-t-sm"
                          style={{
                            height: `${Math.max(4, (t.totalKobo / max) * 100)}%`,
                          }}
                        />
                        <span className="text-[10px] text-gray-400 truncate max-w-full">
                          {t.month}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </section>
          )}

          {/* Top workspaces + members */}
          <div className="grid lg:grid-cols-2 gap-6">
            {analytics.topWorkspaces.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    Top workspaces
                  </h3>
                </div>
                <div className="space-y-3">
                  {analytics.topWorkspaces.map((w, i) => (
                    <div
                      key={w.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {w.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {Number(w.bookings)} booking
                            {Number(w.bookings) !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatNaira(Number(w.revenueKobo))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analytics.topMembers.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-blue-500" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    Top members
                  </h3>
                </div>
                <div className="space-y-3">
                  {analytics.topMembers.map((m, i) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                          {i + 1}
                        </span>
                        <p className="text-sm font-medium text-gray-900">
                          {m.fullName}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatNaira(Number(m.totalKobo))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
