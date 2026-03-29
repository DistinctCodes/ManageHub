"use client";

// frontend/app/invoices/page.tsx

import { useState } from "react";
import Link from "next/link";
import { useGetMyInvoices } from "@/lib/react-query/hooks/invoices/useGetMyInvoices";
import type { Invoice, InvoiceStatus } from "@/lib/types/invoice";

// ── Types ──────────────────────────────────────────────────────────────────────

type FilterTab = "ALL" | InvoiceStatus;

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:6001/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function downloadInvoice(id: string) {
  window.open(`${API_BASE_URL}/invoices/${id}/download`, "_blank");
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const config: Record<InvoiceStatus, { label: string; cls: string }> = {
    PAID:      { label: "Paid",      cls: "mh-badge mh-badge--paid" },
    PENDING:   { label: "Pending",   cls: "mh-badge mh-badge--pending" },
    CANCELLED: { label: "Cancelled", cls: "mh-badge mh-badge--cancelled" },
  };
  const { label, cls } = config[status] ?? { label: status, cls: "mh-badge" };
  return <span className={cls}>{label}</span>;
}

function SkeletonRow() {
  return (
    <tr className="mh-table__row mh-table__row--skeleton">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i}><span className="mh-skeleton" /></td>
      ))}
    </tr>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="mh-empty">
      <div className="mh-empty__icon">🧾</div>
      <p className="mh-empty__title">No invoices found</p>
      <p className="mh-empty__sub">
        {filtered
          ? "Try switching to a different status filter."
          : "Your invoices will appear here once a booking is confirmed."}
      </p>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mh-pagination">
      <button
        className="mh-pagination__btn"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        ← Prev
      </button>
      <span className="mh-pagination__info">
        Page {page} of {totalPages}
      </span>
      <button
        className="mh-pagination__btn"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next →
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS: { label: string; value: FilterTab }[] = [
  { label: "All",      value: "ALL" },
  { label: "Paid",     value: "PAID" },
  { label: "Pending",  value: "PENDING" },
];

const LIMIT = 10;

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [page, setPage]           = useState(1);

  const { data, isLoading, isError } = useGetMyInvoices({
    page,
    limit: LIMIT,
    status: activeTab,
  });

  const invoices   = data?.data ?? [];
  const meta       = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  function handleTabChange(tab: FilterTab) {
    setActiveTab(tab);
    setPage(1); // reset to first page on filter change
  }

  return (
    <>
      <style>{`
        /* ── Scope all styles to .mh-invoices ── */
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .mh-invoices {
          font-family: 'DM Sans', sans-serif;
          max-width: 1100px;
          margin: 0 auto;
          padding: 40px 24px 80px;
          color: #0f172a;
        }

        /* Header */
        .mh-invoices__header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 32px;
          gap: 16px;
          flex-wrap: wrap;
        }
        .mh-invoices__title {
          font-size: 26px;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0;
        }
        .mh-invoices__sub {
          font-size: 14px;
          color: #64748b;
          margin: 4px 0 0;
        }

        /* Tabs */
        .mh-tabs {
          display: flex;
          gap: 4px;
          background: #f1f5f9;
          padding: 4px;
          border-radius: 10px;
          width: fit-content;
          margin-bottom: 24px;
        }
        .mh-tabs__btn {
          padding: 7px 18px;
          border-radius: 7px;
          border: none;
          background: transparent;
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s;
        }
        .mh-tabs__btn--active {
          background: #fff;
          color: #0f172a;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          font-weight: 600;
        }

        /* Table card */
        .mh-card {
          border: 1.5px solid #e2e8f0;
          border-radius: 16px;
          overflow: hidden;
          background: #fff;
        }
        .mh-table-wrap { overflow-x: auto; }
        .mh-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        .mh-table th {
          padding: 13px 18px;
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #94a3b8;
          background: #f8fafc;
          border-bottom: 1.5px solid #e2e8f0;
          white-space: nowrap;
        }
        .mh-table__row td {
          padding: 14px 18px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
          white-space: nowrap;
        }
        .mh-table__row:last-child td { border-bottom: none; }
        .mh-table__row:hover td { background: #fafbfc; }

        /* Invoice number */
        .mh-inv-num {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          font-weight: 500;
          color: #475569;
        }
        /* Amount */
        .mh-amount {
          font-weight: 600;
          font-size: 14px;
        }

        /* Badge */
        .mh-badge {
          display: inline-flex;
          align-items: center;
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .mh-badge--paid      { background: #dcfce7; color: #15803d; }
        .mh-badge--pending   { background: #fef9c3; color: #a16207; }
        .mh-badge--cancelled { background: #fee2e2; color: #b91c1c; }

        /* Action buttons */
        .mh-actions { display: flex; gap: 6px; align-items: center; }
        .mh-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1.5px solid transparent;
          font-family: inherit;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
          text-decoration: none;
        }
        .mh-btn--outline {
          border-color: #e2e8f0;
          background: #fff;
          color: #334155;
        }
        .mh-btn--outline:hover { border-color: #94a3b8; background: #f8fafc; }
        .mh-btn--ghost {
          background: transparent;
          color: #64748b;
          border-color: transparent;
        }
        .mh-btn--ghost:hover { background: #f1f5f9; color: #0f172a; }

        /* Skeleton */
        .mh-skeleton {
          display: block;
          height: 14px;
          width: 80%;
          border-radius: 6px;
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: mh-shimmer 1.4s infinite;
        }
        @keyframes mh-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* Empty state */
        .mh-empty {
          padding: 60px 24px;
          text-align: center;
        }
        .mh-empty__icon { font-size: 40px; margin-bottom: 12px; }
        .mh-empty__title { font-size: 16px; font-weight: 600; margin: 0 0 6px; }
        .mh-empty__sub { font-size: 14px; color: #64748b; margin: 0; }

        /* Error */
        .mh-error {
          padding: 40px 24px;
          text-align: center;
          color: #dc2626;
          font-size: 14px;
        }

        /* Pagination */
        .mh-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 20px;
          border-top: 1px solid #f1f5f9;
        }
        .mh-pagination__btn {
          padding: 7px 16px;
          border-radius: 8px;
          border: 1.5px solid #e2e8f0;
          background: #fff;
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          color: #334155;
        }
        .mh-pagination__btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .mh-pagination__btn:not(:disabled):hover {
          border-color: #94a3b8;
          background: #f8fafc;
        }
        .mh-pagination__info {
          font-size: 13px;
          color: #64748b;
        }
      `}</style>

      {/* Wrap in DashboardLayout in production — left unwrapped here for portability */}
      <div className="mh-invoices">
        {/* Header */}
        <div className="mh-invoices__header">
          <div>
            <h1 className="mh-invoices__title">Invoices</h1>
            <p className="mh-invoices__sub">Your billing history and payment records</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mh-tabs" role="tablist" aria-label="Invoice status filter">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              role="tab"
              aria-selected={activeTab === tab.value}
              className={`mh-tabs__btn${activeTab === tab.value ? " mh-tabs__btn--active" : ""}`}
              onClick={() => handleTabChange(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table Card */}
        <div className="mh-card">
          {isError ? (
            <p className="mh-error">Failed to load invoices. Please try again.</p>
          ) : (
            <div className="mh-table-wrap">
              <table className="mh-table" aria-label="Invoices">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Workspace</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Issue Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                    : invoices.length === 0
                    ? (
                      <tr>
                        <td colSpan={6} style={{ padding: 0 }}>
                          <EmptyState filtered={activeTab !== "ALL"} />
                        </td>
                      </tr>
                    )
                    : invoices.map((inv: Invoice) => (
                      <tr key={inv.id} className="mh-table__row">
                        <td>
                          <span className="mh-inv-num">{inv.invoiceNumber}</span>
                        </td>
                        <td>{inv.booking?.workspaceName ?? "—"}</td>
                        <td>
                          <span className="mh-amount">{formatNaira(inv.amount)}</span>
                        </td>
                        <td><StatusBadge status={inv.status} /></td>
                        <td style={{ color: "#64748b" }}>{formatDate(inv.issueDate)}</td>
                        <td>
                          <div className="mh-actions">
                            <Link
                              href={`/invoices/${inv.id}`}
                              className="mh-btn mh-btn--outline"
                            >
                              View
                            </Link>
                            <button
                              className="mh-btn mh-btn--ghost"
                              onClick={() => downloadInvoice(inv.id)}
                              title="Download PDF"
                              aria-label={`Download invoice ${inv.invoiceNumber}`}
                            >
                              ↓ PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </div>
    </>
  );
}