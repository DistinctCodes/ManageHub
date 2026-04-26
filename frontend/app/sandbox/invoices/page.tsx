"use client";

import { useState } from "react";

interface Invoice {
  id: string;
  number: string;
  date: string;
  amount: string;
  status: "paid" | "pending" | "overdue";
}

const MOCK_INVOICES: Invoice[] = [
  { id: "1", number: "INV-001", date: "2026-01-15", amount: "$120.00", status: "paid" },
  { id: "2", number: "INV-002", date: "2026-02-03", amount: "$85.00",  status: "paid" },
  { id: "3", number: "INV-003", date: "2026-03-10", amount: "$200.00", status: "pending" },
  { id: "4", number: "INV-004", date: "2026-03-28", amount: "$65.00",  status: "overdue" },
  { id: "5", number: "INV-005", date: "2026-04-01", amount: "$150.00", status: "pending" },
  { id: "6", number: "INV-006", date: "2026-04-10", amount: "$95.00",  status: "paid" },
  { id: "7", number: "INV-007", date: "2026-04-18", amount: "$175.00", status: "paid" },
  { id: "8", number: "INV-008", date: "2026-04-20", amount: "$110.00", status: "pending" },
  { id: "9", number: "INV-009", date: "2026-04-21", amount: "$90.00",  status: "overdue" },
  { id: "10", number: "INV-010", date: "2026-04-22", amount: "$130.00", status: "paid" },
  { id: "11", number: "INV-011", date: "2026-04-23", amount: "$70.00",  status: "pending" },
];

const STATUS_STYLES: Record<Invoice["status"], string> = {
  paid:    "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  overdue: "bg-red-100 text-red-700",
};

const PAGE_SIZE = 10;

function Skeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: PAGE_SIZE }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded bg-gray-100" />
      ))}
    </div>
  );
}

export default function InvoicesPage() {
  const [page, setPage] = useState(1);
  const [loading] = useState(false);

  const totalPages = Math.ceil(MOCK_INVOICES.length / PAGE_SIZE);
  const pageItems = MOCK_INVOICES.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDownload = (invoice: Invoice) => {
    const blob = new Blob([`Invoice: ${invoice.number}\nDate: ${invoice.date}\nAmount: ${invoice.amount}\nStatus: ${invoice.status}`], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${invoice.number}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Invoices</h1>

        {loading ? (
          <Skeleton />
        ) : MOCK_INVOICES.length === 0 ? (
          <div className="rounded-lg border bg-white p-12 text-center text-gray-400 shadow-sm">
            No invoices found.
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Invoice #</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageItems.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{inv.number}</td>
                      <td className="px-4 py-3 text-gray-600">{inv.date}</td>
                      <td className="px-4 py-3 text-gray-800">{inv.amount}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[inv.status]}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDownload(inv)}
                          className="rounded bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100"
                        >
                          Download PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded border px-3 py-1 hover:bg-gray-50 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded border px-3 py-1 hover:bg-gray-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
