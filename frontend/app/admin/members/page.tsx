"use client";

import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useGetAllMembers } from "@/lib/react-query/hooks/admin/members/useGetAllMembers";
import { useUpdateMemberStatus } from "@/lib/react-query/hooks/admin/members/useUpdateMemberStatus";
import { Users, Search, ChevronLeft, ChevronRight } from "lucide-react";

export default function AdminMembersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading } = useGetAllMembers(page, 15, search);
  const updateStatus = useUpdateMemberStatus();

  const members = data?.data ?? [];
  const meta = data?.meta;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {meta?.total ?? 0} total members
          </p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6 max-w-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Search
        </button>
      </form>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 h-20 animate-pulse"
            />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="w-10 h-10 text-gray-200 mb-4" />
          <p className="text-sm font-medium text-gray-500">No members found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
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
              <tbody>
                {members.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-gray-50 last:border-0"
                  >
                    <td className="px-5 py-3.5 font-medium text-gray-900">
                      {m.firstname} {m.lastname}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{m.email}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          m.role === "admin"
                            ? "bg-purple-50 text-purple-600"
                            : "bg-gray-50 text-gray-600"
                        }`}
                      >
                        {m.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          m.isSuspended
                            ? "bg-red-50 text-red-600"
                            : m.isActive
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-gray-50 text-gray-500"
                        }`}
                      >
                        {m.isSuspended
                          ? "Suspended"
                          : m.isActive
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400">
                      {new Date(m.createdAt).toLocaleDateString("en", {
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
                          const action = e.target.value as
                            | "suspend"
                            | "activate"
                            | "make-admin"
                            | "make-user"
                            | "";
                          if (action) {
                            updateStatus.mutate({ id: m.id, action });
                            e.target.value = "";
                          }
                        }}
                      >
                        <option value="" disabled>
                          Action
                        </option>
                        {m.isSuspended ? (
                          <option value="activate">Activate</option>
                        ) : (
                          <option value="suspend">Suspend</option>
                        )}
                        {m.role === "admin" ? (
                          <option value="make-user">Demote to user</option>
                        ) : (
                          <option value="make-admin">Promote to admin</option>
                        )}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
              <p className="text-gray-400">
                Page {meta.page} of {meta.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-1.5 rounded-md border border-gray-200 disabled:opacity-30 hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded-md border border-gray-200 disabled:opacity-30 hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
