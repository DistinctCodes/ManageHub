"use client";

import { useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

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

interface Props {
  initialData: UserRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  onRefresh: () => void;
}

export default function AdminUserTable({ initialData, meta, onRefresh }: Props) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(meta.page);
  const [users, setUsers] = useState(initialData);
  const [pageMeta, setPageMeta] = useState(meta);

  const fetchPage = async (p: number, s?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "10" });
      if (s) params.set("search", s);
      const res = await apiClient.get<{
        success: boolean;
        data: UserRow[];
        meta: typeof meta;
      }>(`/dashboard/admin/users?${params}`);
      setUsers(res.data);
      setPageMeta(res.meta);
      setPage(p);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (
    userId: string,
    action: "suspend" | "activate" | "delete" | "make-admin" | "make-user"
  ) => {
    try {
      if (action === "delete") {
        await apiClient.delete(`/users/${userId}`);
      } else if (action === "suspend") {
        await apiClient.patch(`/users/${userId}`, { isSuspended: true });
      } else if (action === "activate") {
        await apiClient.patch(`/users/${userId}`, {
          isSuspended: false,
          isActive: true,
        });
      } else if (action === "make-admin") {
        await apiClient.patch(`/users/${userId}`, { role: "admin" });
      } else if (action === "make-user") {
        await apiClient.patch(`/users/${userId}`, { role: "user" });
      }
      fetchPage(page, search);
      onRefresh();
    } catch {
      // silently fail
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPage(1, search);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100">
      <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900">
          All users{" "}
          <span className="text-gray-400 font-normal">({pageMeta.total})</span>
        </h3>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 w-56"
            />
          </div>
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-50">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Joined</th>
              <th className="px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className={loading ? "opacity-50" : ""}>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-b border-gray-50 last:border-0"
              >
                <td className="px-5 py-3.5 font-medium text-gray-900">
                  {u.firstname} {u.lastname}
                </td>
                <td className="px-5 py-3.5 text-gray-500">{u.email}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      u.role === "admin"
                        ? "bg-purple-50 text-purple-600"
                        : "bg-gray-50 text-gray-600"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      u.isSuspended
                        ? "bg-red-50 text-red-600"
                        : u.isActive
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-gray-50 text-gray-500"
                    }`}
                  >
                    {u.isSuspended
                      ? "Suspended"
                      : u.isActive
                      ? "Active"
                      : "Inactive"}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-gray-400">
                  {new Date(u.createdAt).toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="px-5 py-3.5">
                  <select
                    className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAction(
                          u.id,
                          e.target.value as
                            | "suspend"
                            | "activate"
                            | "delete"
                            | "make-admin"
                            | "make-user"
                        );
                        e.target.value = "";
                      }
                    }}
                  >
                    <option value="" disabled>
                      Action
                    </option>
                    {u.isSuspended ? (
                      <option value="activate">Activate</option>
                    ) : (
                      <option value="suspend">Suspend</option>
                    )}
                    {u.role === "admin" ? (
                      <option value="make-user">Demote to user</option>
                    ) : (
                      <option value="make-admin">Promote to admin</option>
                    )}
                    <option value="delete">Delete</option>
                  </select>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageMeta.totalPages > 1 && (
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
          <p className="text-gray-400">
            Page {pageMeta.page} of {pageMeta.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={pageMeta.page <= 1}
              onClick={() => fetchPage(pageMeta.page - 1, search)}
              className="p-1.5 rounded-md border border-gray-200 disabled:opacity-30 hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={pageMeta.page >= pageMeta.totalPages}
              onClick={() => fetchPage(pageMeta.page + 1, search)}
              className="p-1.5 rounded-md border border-gray-200 disabled:opacity-30 hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
