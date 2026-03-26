"use client";

import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useGetWorkspaces } from "@/lib/react-query/hooks/workspaces/useGetWorkspaces";
import { WorkspaceType } from "@/lib/types/workspace";
import WorkspaceCard from "@/components/workspaces/WorkspaceCard";
import { Search, SlidersHorizontal, Building2 } from "lucide-react";

const WORKSPACE_TYPES: { label: string; value: WorkspaceType | "" }[] = [
  { label: "All Types", value: "" },
  { label: "Coworking", value: "COWORKING" },
  { label: "Private Office", value: "PRIVATE_OFFICE" },
  { label: "Meeting Room", value: "MEETING_ROOM" },
  { label: "Hot Desk", value: "HOT_DESK" },
  { label: "Dedicated Desk", value: "DEDICATED_DESK" },
];

export default function WorkspacesPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<WorkspaceType | "">("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useGetWorkspaces({
    search: search || undefined,
    type: type || undefined,
    page,
    limit: 9,
  });

  const workspaces = data?.data ?? [];
  const meta = data?.meta;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Workspaces</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Browse and book available workspaces.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search workspaces..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>
        <div className="relative">
          <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as WorkspaceType | "");
              setPage(1);
            }}
            className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 bg-white appearance-none cursor-pointer"
          >
            {WORKSPACE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 h-64 animate-pulse"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-16 text-gray-500">
          <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Failed to load workspaces</p>
          <p className="text-sm mt-1">Please try again later.</p>
        </div>
      ) : workspaces.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No workspaces found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {workspaces.map((ws) => (
              <WorkspaceCard key={ws.id} workspace={ws} />
            ))}
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-8">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * 9 + 1}–{Math.min(page * 9, meta.total)} of{" "}
                {meta.total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(meta.totalPages, p + 1))
                  }
                  disabled={page === meta.totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
