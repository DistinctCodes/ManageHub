"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, BarChart3, DollarSign, Users, Building2 } from "lucide-react";
import api from "@/lib/axios";

type Tab = "bookings" | "revenue" | "members" | "occupancy";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "bookings", label: "Bookings", icon: BarChart3 },
  { key: "revenue", label: "Revenue", icon: DollarSign },
  { key: "members", label: "Members", icon: Users },
  { key: "occupancy", label: "Occupancy", icon: Building2 },
];

function fmt(kobo: number) {
  return `₦${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

export default function AdminReportsPage() {
  const [tab, setTab] = useState<Tab>("bookings");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const params: Record<string, string> = {};
  if (from) params.from = new Date(from).toISOString();
  if (to) params.to = new Date(to).toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ["report", tab, from, to],
    queryFn: async () => {
      const r = await api.get(`/reports/${tab}`, { params });
      return r.data.data;
    },
  });

  const handleExport = async () => {
    const r = await api.get(`/reports/${tab}`, {
      params: { ...params, format: "csv" },
      responseType: "blob",
    });
    const url = URL.createObjectURL(new Blob([r.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tab}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input
            type="date"
            className="border rounded-lg px-3 py-1.5 text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input
            type="date"
            className="border rounded-lg px-3 py-1.5 text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
      ) : (
        <>
          {tab === "bookings" && <BookingsTable rows={Array.isArray(data) ? data : []} />}
          {tab === "revenue" && <RevenueView data={data} />}
          {tab === "members" && <MembersView data={data} />}
          {tab === "occupancy" && <OccupancyTable rows={Array.isArray(data) ? data : []} />}
        </>
      )}
    </div>
  );
}

function BookingsTable({ rows }: { rows: any[] }) {
  const STATUS_COLORS: Record<string, string> = {
    confirmed: "bg-green-100 text-green-700",
    pending: "bg-amber-100 text-amber-700",
    cancelled: "bg-red-100 text-red-700",
    completed: "bg-blue-100 text-blue-700",
  };
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-100 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {["Member", "Workspace", "Start", "End", "Status", "Total"].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                No data
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">{r.member}</td>
                <td className="px-4 py-3">{r.workspace}</td>
                <td className="px-4 py-3">{r.startDate}</td>
                <td className="px-4 py-3">{r.endDate}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">{fmt(r.totalKobo)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function RevenueView({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Revenue" value={fmt(data.totalKobo ?? 0)} color="indigo" />
        <StatCard label="Paid" value={fmt(data.paidKobo ?? 0)} color="green" />
        <StatCard label="Outstanding" value={fmt(data.outstandingKobo ?? 0)} color="amber" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Invoice ID", "User", "Amount", "Status", "Date"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {(data.invoices ?? []).map((inv: any) => (
              <tr key={inv.id}>
                <td className="px-4 py-3 font-mono text-xs">{inv.id?.slice(0, 8)}</td>
                <td className="px-4 py-3 text-xs">{inv.userId?.slice(0, 8)}</td>
                <td className="px-4 py-3 font-medium">{fmt(inv.amountKobo)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${inv.status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                    {inv.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(inv.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MembersView({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total Members" value={String(data.total ?? 0)} color="indigo" />
        <StatCard label="New in Period" value={String(data.newInPeriod ?? 0)} color="green" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Name", "Email", "Role", "Status", "Joined"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {(data.members ?? []).map((m: any) => (
              <tr key={m.id}>
                <td className="px-4 py-3 font-medium">{m.fullName}</td>
                <td className="px-4 py-3 text-gray-500">{m.email}</td>
                <td className="px-4 py-3 capitalize">{m.role}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${m.membershipStatus === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {m.membershipStatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(m.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OccupancyTable({ rows }: { rows: any[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-100 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {["Workspace", "Type", "Bookings in Period"].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-8 text-center text-gray-400">No data</td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.workspaceId}>
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3 capitalize">{r.type}</td>
                <td className="px-4 py-3">{r.bookingCount}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-700",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <div className={`rounded-xl p-4 ${colors[color] ?? "bg-gray-50 text-gray-700"}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
