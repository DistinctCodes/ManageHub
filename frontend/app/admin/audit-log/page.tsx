"use client";

import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useGetAuditLog } from "@/lib/react-query/hooks/admin/audit/useGetAuditLog";
import { ChevronDown, ChevronRight, Shield } from "lucide-react";
import { useAuthState } from "@/lib/store/authStore";

const RESOURCE_TYPES = ["", "User", "Booking", "Payment", "Workspace", "PromoCode"];

export default function AdminAuditLogPage() {
  const { user } = useAuthState();
  const [filters, setFilters] = useState<{ resourceType?: string; startDate?: string; endDate?: string; page: number }>({ page: 1 });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading } = useGetAuditLog({ ...filters, limit: 20 });
  const logs = (data as any)?.items ?? [];
  const meta = data as any;

  if (user?.role !== "super_admin" && user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="text-center py-16 text-gray-400">
          <Shield className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Access restricted to super admins.</p>
        </div>
      </DashboardLayout>
    );
  }

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-gray-500 text-sm mt-1">Read-only record of all sensitive admin actions.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          onChange={(e) => setFilters((f) => ({ ...f, resourceType: e.target.value || undefined, page: 1 }))}
        >
          {RESOURCE_TYPES.map((r) => <option key={r} value={r}>{r || "All resource types"}</option>)}
        </select>
        <input
          type="date"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value || undefined, page: 1 }))}
        />
        <input
          type="date"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value || undefined, page: 1 }))}
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No audit records found.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {["Actor", "Action", "Resource Type", "Resource ID", "Date/Time", "IP"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log: any) => (
                <>
                  <tr key={log.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => toggle(log.id)}>
                    <td className="px-4 py-3 text-gray-900">
                      {log.actor ? `${log.actor.firstname} ${log.actor.lastname}` : log.actorUserId?.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{log.action}</td>
                    <td className="px-4 py-3 text-gray-500">{log.resourceType}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{log.resourceId?.slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-gray-400">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-400">{log.ipAddress ?? "—"}</td>
                    <td className="px-4 py-3">
                      {expanded.has(log.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </td>
                  </tr>
                  {expanded.has(log.id) && (
                    <tr key={`${log.id}-detail`}>
                      <td colSpan={7} className="px-4 py-3 bg-gray-50">
                        <pre className="text-xs text-gray-600 overflow-auto max-h-40">{JSON.stringify(log.metadata, null, 2)}</pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          {meta?.totalPages > 1 && (
            <div className="flex justify-between items-center px-4 py-3 border-t">
              <span className="text-sm text-gray-500">Page {filters.page} of {meta.totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }))} disabled={filters.page === 1} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40">Previous</button>
                <button onClick={() => setFilters((f) => ({ ...f, page: Math.min(meta.totalPages, f.page + 1) }))} disabled={filters.page === meta.totalPages} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
