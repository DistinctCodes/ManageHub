"use client";

import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useGetMyInvoices } from "@/lib/react-query/hooks/invoices/useGetMyInvoices";
import { Invoice, InvoiceStatus } from "@/lib/types/invoice";
import { FileText, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { storage } from "@/lib/storage";

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  PAID: "bg-green-50 text-green-700",
  PENDING: "bg-amber-50 text-amber-700",
  CANCELLED: "bg-red-50 text-red-600",
};

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const [downloading, setDownloading] = useState(false);

  const amountNaira = (invoice.amountKobo / 100).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
  });

  async function handleDownload() {
    setDownloading(true);
    try {
      const token = storage.getToken();
      const API_BASE =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:6001/api";
      const res = await fetch(`${API_BASE}/invoices/${invoice.id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download invoice");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-gray-400" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">
              {invoice.invoiceNumber}
            </p>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                STATUS_STYLES[invoice.status]
              }`}
            >
              {invoice.status}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {invoice.paidAt
              ? `Paid ${new Date(invoice.paidAt).toLocaleDateString()}`
              : `Created ${new Date(invoice.createdAt).toLocaleDateString()}`}
          </p>
          {invoice.lineItems?.[0]?.description && (
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">
              {invoice.lineItems[0].description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <p className="text-base font-bold text-gray-900">{amountNaira}</p>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-xs font-medium text-gray-600 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
        >
          {downloading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          PDF
        </button>
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useGetMyInvoices(page, 10);

  const invoices = data?.data ?? [];
  const meta = data?.meta;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <p className="text-gray-500 mt-1 text-sm">
          View and download your payment invoices.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 h-20 animate-pulse"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-16 text-gray-500">
          <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Failed to load invoices</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No invoices yet</p>
          <p className="text-sm mt-1">
            Invoices are generated automatically after successful payments.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {invoices.map((inv) => (
              <InvoiceRow key={inv.id} invoice={inv} />
            ))}
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-8">
              <p className="text-sm text-gray-500">
                {meta.total} invoice{meta.total !== 1 ? "s" : ""} total
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(meta.totalPages, p + 1))
                  }
                  disabled={page === meta.totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
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
