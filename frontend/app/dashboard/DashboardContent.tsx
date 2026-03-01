"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/apiClient";
import { useAuthState } from "@/lib/store/authStore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatsCards from "@/components/dashboard/StatsCards";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import QuickActions from "@/components/dashboard/QuickActions";
import AnalyticsChart from "@/components/dashboard/AnalyticsChart";
import AdminOverview from "@/components/dashboard/AdminOverview";
import AdminUserTable from "@/components/dashboard/AdminUserTable";

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

export default function DashboardContent() {
  const { user } = useAuthState();
  const isAdmin = user?.role === "admin";

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
          <StatsCards stats={stats} />

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
