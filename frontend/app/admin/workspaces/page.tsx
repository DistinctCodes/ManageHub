"use client";

import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import WorkspaceFormModal from "@/components/admin/WorkspaceFormModal";
import { useGetAdminWorkspaces } from "@/lib/react-query/hooks/admin/workspaces/useGetAdminWorkspaces";
import { useToggleWorkspaceActive } from "@/lib/react-query/hooks/admin/workspaces/useToggleWorkspaceActive";
import { Workspace } from "@/lib/types/workspace";
import {
  Plus,
  Search,
  Pencil,
  PowerOff,
  Power,
  ChevronLeft,
  ChevronRight,
  Building2,
} from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  COWORKING: "Coworking",
  PRIVATE_OFFICE: "Private Office",
  MEETING_ROOM: "Meeting Room",
  HOT_DESK: "Hot Desk",
  DEDICATED_DESK: "Dedicated Desk",
};

function formatNaira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(kobo / 100);
}

export default function AdminWorkspacesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [modalWorkspace, setModalWorkspace] = useState<
    Workspace | null | "new"
  >(null);

  const { data, isLoading } = useGetAdminWorkspaces(page, 15, search);
  const toggle = useToggleWorkspaceActive();

  const workspaces = data?.data ?? [];
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
          <h1 className="text-2xl font-bold text-gray-900">Workspaces</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {meta?.total ?? 0} total workspaces
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalWorkspace("new")}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New workspace
        </button>
      </div>

      {/* Search bar */}
      <form
        onSubmit={handleSearch}
        className="flex gap-2 mb-6 max-w-sm"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search workspaces..."
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
      ) : workspaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="w-10 h-10 text-gray-200 mb-4" />
          <p className="text-sm font-medium text-gray-500">No workspaces found</p>
          <button
            type="button"
            onClick={() => setModalWorkspace("new")}
            className="mt-4 text-sm text-gray-900 underline"
          >
            Create the first one
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-50">
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Seats</th>
                    <th className="px-5 py-3 font-medium">Rate/hr</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workspaces.map((w) => (
                    <tr
                      key={w.id}
                      className="border-b border-gray-50 last:border-0"
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-900">{w.name}</p>
                        {w.description && (
                          <p className="text-xs text-gray-400 truncate max-w-xs mt-0.5">
                            {w.description}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">
                        {TYPE_LABELS[w.type] ?? w.type}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">
                        {w.availableSeats}/{w.totalSeats}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">
                        {formatNaira(w.hourlyRate)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            w.isActive
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {w.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setModalWorkspace(w)}
                            title="Edit"
                            className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5 text-gray-500" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              toggle.mutate({
                                id: w.id,
                                isActive: !w.isActive,
                              })
                            }
                            title={
                              w.isActive ? "Deactivate" : "Activate"
                            }
                            className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
                          >
                            {w.isActive ? (
                              <PowerOff className="w-3.5 h-3.5 text-red-400" />
                            ) : (
                              <Power className="w-3.5 h-3.5 text-emerald-500" />
                            )}
                          </button>
                        </div>
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
        </>
      )}

      {/* Modal */}
      {modalWorkspace !== null && (
        <WorkspaceFormModal
          workspace={modalWorkspace === "new" ? undefined : modalWorkspace}
          onClose={() => setModalWorkspace(null)}
        />
      )}
    </DashboardLayout>
  );
}
