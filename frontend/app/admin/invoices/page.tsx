"use client";

import { useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useGetAdminInvoices } from "@/lib/react-query/hooks/admin/invoices/useGetAdminInvoices";
import { InvoiceStatus } from "@/lib/types/invoice";
import { FileText, ChevronLeft, ChevronRight, Download } from "lucide-react";

const STATUS_OPTIONS: { value: InvoiceStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "PAID", label: "Paid" },
  { value: "PENDING", label: "Unpaid" },
  { value: "CANCELLED", label: "Overdue" },
];

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  PAID: "bg-emerald-50 text-emerald-700",
  PENDING: "bg-amber-50 text-amber-700",
  CANCELLED: "bg-red-50 text-red-600",
};

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  PAID: "Paid",
  PENDING: "Unpaid",
  CANCELLED: "Overdue",
};

function formatNaira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(kobo / 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", { dateStyle: "medium" });
}

export default function AdminInvoicesPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<InvoiceStatus | "">("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");

  const { data, isLoading } = useGetAdminInvoices({
    page,
    limit: 20,
    status,
    search: appliedSearch,
    from: appliedFrom,
    to: appliedTo,
  });

  const invoices = data?.data ?? [];
  const meta = data?.meta;

  const total = meta?.total ?? 0;
  const paid = invoices.filter((i) => i.status === "PAID").length;
  const unpaid = invoices.filter((i) => i.status === "PENDING").length;
  const totalRevenue = invoices
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + i.amountKobo, 0);

  const applySearch = () => {
    setAppliedSearch(search);
    setAppliedFrom(from);
    setAppliedTo(to);
    setPage(1);
  };

  const handleDownload = (id: string, invoiceNumber: string) => {
    const link = document.createElement("a");
    link.href = `/invoices/${id}/download`;
    link.setAttribute("download", `${invoiceNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <p className="text-gray-500 mt-1 text-sm">{total} total invoices</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Invoices", value: total.toString() },
          { label: "Paid", value: paid.toString() },
          { label: "Unpaid", value: unpaid.toString() },
          { label: "Total Revenue", value: formatNaira(totalRevenue) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl p-5 border border-gray-100">
            <p className="text-2xl font-bold text-gray-900 truncate">{value}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search member or invoice #"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applySearch()}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 w-56"
        />
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
        />
        <span className="text-gray-400 self-center text-sm">to</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
        />
        <button
          type="button"
          onClick={applySearch}
          className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          Search
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUS_OPTIONS.map(({ value, label }) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              setStatus(value as InvoiceStatus | "");
              setPage(1);
            }}
            className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              status === value
                ? "bg-gray-900 text-white border-gray-900"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 h-14 animate-pulse" />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="w-10 h-10 text-gray-200 mb-4" />
          <p className="text-sm font-medium text-gray-500">No invoices found</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-50">
                    <th className="px-5 py-3 font-medium">Invoice #</th>
                    <th className="px-5 py-3 font-medium">Booking Ref</th>
                    <th className="px-5 py-3 font-medium">Amount</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Issue Date</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="font-mono text-xs text-blue-600 hover:underline"
                        >
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 font-mono text-xs">
                        {inv.bookingId.slice(0, 8)}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-gray-900">
                        {formatNaira(inv.amountKobo)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[inv.status]}`}
                        >
                          {STATUS_LABELS[inv.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                        {formatDate(inv.createdAt)}
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleDownload(inv.id, inv.invoiceNumber)}
                          className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-500"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
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
    </DashboardLayout>
  );
}
