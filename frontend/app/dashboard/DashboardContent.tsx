"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/apiClient";
import { useAuthState } from "@/lib/store/authStore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatsCards from "@/components/dashboard/StatsCards";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import QuickActions from "@/components/dashboard/QuickActions";
import AnalyticsChart from "@/components/dashboard/AnalyticsChart";
import AdminOverview from "@/components/dashboard/AdminOverview";
import AdminUserTable from "@/components/dashboard/AdminUserTable";
import MemberStatsCards from "@/components/dashboard/MemberStatsCards";

interface Stats {
  totalMembers: number;
  verifiedMembers: number;
  activeWorkspaces: number;
  deskOccupancy: number;
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

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

interface UserRow {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  role: string;
  isActive: boolean;
  isSuspended: boolean;
  isVerified: boolean;
  createdAt: string;
  profilePicture?: string;
}

interface RecentBooking {
  id: string;
  workspace: {
    id: string;
    name: string;
    type: string;
  };
  status: string;
  startDate: string;
  endDate: string;
}

interface RecentPayment {
  id: string;
  booking?: {
    workspace?: {
      id: string;
      name: string;
    };
  };
  amountKobo: number;
  createdAt: string;
}

export default function DashboardContent() {
  const { user } = useAuthState();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin" || user?.role === "staff";

  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [adminUsers, setAdminUsers] = useState<UserRow[]>([]);
  const [usersMeta, setUsersMeta] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, activityRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: Stats }>("/dashboard/stats"),
        apiClient.get<{ success: boolean; data: ActivityItem[] }>(
          "/dashboard/activity"
        ),
      ]);
      setStats(statsRes.data);
      setActivity(activityRes.data);

      if (isAdmin) {
        const [adminStatsRes, adminUsersRes] = await Promise.all([
          apiClient.get<{ success: boolean; data: AdminStats }>(
            "/dashboard/admin/stats"
          ),
          apiClient.get<{
            success: boolean;
            data: UserRow[];
            meta: typeof usersMeta;
          }>("/dashboard/admin/users?page=1&limit=10"),
        ]);
        setAdminStats(adminStatsRes.data);
        setAdminUsers(adminUsersRes.data);
        setUsersMeta(adminUsersRes.meta);
      }

      // Fetch member dashboard data for non-admin users
      if (!isAdmin) {
        const memberDashboardRes = await apiClient.get<{
          success: boolean;
          data: {
            recentBookings: RecentBooking[];
            recentPayments: RecentPayment[];
          };
        }>("/dashboard/member");
        setRecentBookings(memberDashboardRes.data.recentBookings || []);
        setRecentPayments(memberDashboardRes.data.recentPayments || []);
      }
    } catch {
      // API unavailable — show empty state
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {user ? `Welcome back, ${user.firstname}` : "Dashboard"}
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Here&apos;s what&apos;s happening in your workspace.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 h-32 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats cards */}
          {isAdmin ? (
            <StatsCards stats={stats} />
          ) : (
            <MemberStatsCards />
          )}

          {/* Member recent activity sections */}
          {!isAdmin && (
            <>
              {/* Recent Bookings */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Recent Bookings
                  </h2>
                  <Link
                    href="/bookings"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View all
                  </Link>
                </div>
                {recentBookings.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4">
                    No recent bookings found.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-900">
                            {booking.workspace.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {booking.workspace.type} •{" "}
                            {new Date(booking.startDate).toLocaleDateString("en-NG", {
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            -{" "}
                            {new Date(booking.endDate).toLocaleDateString("en-NG", {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            booking.status === "CONFIRMED"
                              ? "bg-green-50 text-green-700"
                              : booking.status === "PENDING"
                              ? "bg-yellow-50 text-yellow-700"
                              : booking.status === "CANCELLED"
                              ? "bg-red-50 text-red-700"
                              : "bg-gray-50 text-gray-700"
                          }`}
                        >
                          {booking.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Payments */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Recent Payments
                  </h2>
                  <Link
                    href="/payments"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View all
                  </Link>
                </div>
                {recentPayments.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4">
                    No recent payments found.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-900">
                            {payment.booking?.workspace?.name || "Workspace Booking"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(payment.createdAt).toLocaleDateString("en-NG", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          ₦{(payment.amountKobo / 100).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Middle row — activity + quick actions */}
          <div className="grid lg:grid-cols-2 gap-6">
            <ActivityFeed activities={activity} />
            <QuickActions />
          </div>

          {/* Admin section */}
          {isAdmin && (
            <>
              <div className="pt-6 border-t border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Admin panel
                </h2>
              </div>

              <AdminOverview stats={adminStats} />

              {/* Chart */}
              {adminStats?.registrationTrend && (
                <AnalyticsChart data={adminStats.registrationTrend} />
              )}

              {/* User management table */}
              <AdminUserTable
                initialData={adminUsers}
                meta={usersMeta}
                onRefresh={fetchData}
              />
            </>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
