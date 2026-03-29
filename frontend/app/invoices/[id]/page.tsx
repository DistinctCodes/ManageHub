"use client";

// frontend/app/invoices/[id]/page.tsx

import { use } from "react";
import Link from "next/link";
import { useGetInvoice } from "@/lib/react-query/hooks/invoices/useGetInvoice";

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

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function InvoiceSkeleton() {
  return (
    <div className="mhi-skeleton-wrap">
      {[120, 80, 200, 160, 140, 180].map((w, i) => (
        <span key={i} className="mhi-skeleton" style={{ width: w }} />
      ))}
    </div>
  );
}

// ── Detail Row ────────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="mhi-row">
      <span className="mhi-row__label">{label}</span>
      <span className="mhi-row__value">{value}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function InvoiceDetailPage({ params }: PageProps) {
  // Next.js 15 App Router: params is a Promise
  const { id } = use(params);

  const { data: invoice, isLoading, isError } = useGetInvoice(id);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .mhi-page {
          font-family: 'DM Sans', sans-serif;
          max-width: 760px;
          margin: 0 auto;
          padding: 40px 24px 80px;
          color: #0f172a;
        }

        /* Back link */
        .mhi-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 500;
          color: #64748b;
          text-decoration: none;
          margin-bottom: 28px;
          transition: color 0.15s;
        }
        .mhi-back:hover { color: #0f172a; }

        /* Invoice card */
        .mhi-card {
          border: 1.5px solid #e2e8f0;
          border-radius: 20px;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 4px 24px rgba(0,0,0,0.05);
        }

        /* Card header / branding */
        .mhi-header {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          padding: 32px 36px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 20px;
        }
        .mhi-brand {
          color: #fff;
        }
        .mhi-brand__name {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0 0 4px;
        }
        .mhi-brand__tagline {
          font-size: 12px;
          color: #94a3b8;
          margin: 0;
        }
        .mhi-header-meta { text-align: right; }
        .mhi-invoice-label {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #94a3b8;
          margin: 0 0 4px;
        }
        .mhi-invoice-num {
          font-family: 'DM Mono', monospace;
          font-size: 16px;
          font-weight: 500;
          color: #fff;
          margin: 0 0 6px;
        }
        .mhi-invoice-date {
          font-size: 12px;
          color: #94a3b8;
          margin: 0;
        }

        /* PAID badge on header */
        .mhi-paid-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #22c55e20;
          border: 1.5px solid #22c55e50;
          color: #4ade80;
          padding: 4px 14px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-top: 6px;
        }
        .mhi-paid-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #4ade80;
        }

        /* Sections */
        .mhi-body { padding: 32px 36px; }
        .mhi-section { margin-bottom: 28px; }
        .mhi-section:last-child { margin-bottom: 0; }
        .mhi-section-title {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #94a3b8;
          margin: 0 0 12px;
        }

        /* Row */
        .mhi-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 16px;
          padding: 9px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .mhi-row:last-child { border-bottom: none; }
        .mhi-row__label {
          font-size: 13px;
          color: #64748b;
          font-weight: 500;
          flex-shrink: 0;
        }
        .mhi-row__value {
          font-size: 14px;
          font-weight: 500;
          color: #0f172a;
          text-align: right;
        }

        /* Amount total */
        .mhi-total {
          margin-top: 24px;
          padding: 20px 24px;
          background: #f8fafc;
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .mhi-total__label {
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .mhi-total__amount {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #0f172a;
        }

        /* Divider */
        .mhi-divider {
          border: none;
          border-top: 1.5px solid #f1f5f9;
          margin: 0;
        }

        /* Actions footer */
        .mhi-footer {
          padding: 20px 36px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          background: #f8fafc;
        }
        .mhi-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          border-radius: 10px;
          border: 1.5px solid transparent;
          font-family: inherit;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.15s;
        }
        .mhi-btn--primary {
          background: #0f172a;
          color: #fff;
          border-color: #0f172a;
        }
        .mhi-btn--primary:hover { background: #1e293b; }
        .mhi-btn--outline {
          background: #fff;
          color: #334155;
          border-color: #e2e8f0;
        }
        .mhi-btn--outline:hover { border-color: #94a3b8; background: #f1f5f9; }

        /* Skeleton */
        .mhi-skeleton-wrap {
          padding: 48px 36px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .mhi-skeleton {
          display: block;
          height: 16px;
          border-radius: 8px;
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: mhi-shimmer 1.4s infinite;
        }
        @keyframes mhi-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* 404 state */
        .mhi-not-found {
          text-align: center;
          padding: 80px 24px;
        }
        .mhi-not-found__code {
          font-size: 64px;
          font-weight: 800;
          letter-spacing: -0.04em;
          color: #e2e8f0;
          margin: 0 0 8px;
        }
        .mhi-not-found__title {
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 8px;
        }
        .mhi-not-found__sub {
          font-size: 14px;
          color: #64748b;
          margin: 0 0 24px;
        }

        @media (max-width: 600px) {
          .mhi-header { padding: 24px 20px; }
          .mhi-body   { padding: 24px 20px; }
          .mhi-footer { padding: 16px 20px; }
          .mhi-header-meta { text-align: left; }
        }
      `}</style>

      {/* Wrap in DashboardLayout in production */}
      <div className="mhi-page">
        <Link href="/invoices" className="mhi-back">
          ← Back to Invoices
        </Link>

        <div className="mhi-card">
          {isLoading ? (
            <InvoiceSkeleton />
          ) : isError || !invoice ? (
            /* 404 / error state */
            <div className="mhi-not-found">
              <p className="mhi-not-found__code">404</p>
              <p className="mhi-not-found__title">Invoice not found</p>
              <p className="mhi-not-found__sub">
                This invoice doesn't exist or you don't have access to it.
              </p>
              <Link href="/invoices" className="mhi-btn mhi-btn--outline">
                ← Back to Invoices
              </Link>
            </div>
          ) : (
            <>
              {/* ── Branded Header ── */}
              <div className="mhi-header">
                <div className="mhi-brand">
                  <p className="mhi-brand__name">ManageHub</p>
                  <p className="mhi-brand__tagline">Smart Hub & Workspace Management</p>
                </div>
                <div className="mhi-header-meta">
                  <p className="mhi-invoice-label">Invoice</p>
                  <p className="mhi-invoice-num">{invoice.invoiceNumber}</p>
                  <p className="mhi-invoice-date">Issued {formatDate(invoice.issueDate)}</p>
                  {invoice.status === "PAID" && (
                    <div className="mhi-paid-badge">
                      <span className="mhi-paid-dot" />
                      Paid
                    </div>
                  )}
                </div>
              </div>

              {/* ── Body ── */}
              <div className="mhi-body">
                {/* Bill To */}
                <div className="mhi-section">
                  <p className="mhi-section-title">Bill To</p>
                  <Row label="Name"  value={invoice.member?.name  ?? "—"} />
                  <Row label="Email" value={invoice.member?.email ?? "—"} />
                </div>

                <hr className="mhi-divider" />

                {/* Booking / Workspace */}
                <div className="mhi-section" style={{ marginTop: 28 }}>
                  <p className="mhi-section-title">Booking Details</p>
                  <Row label="Workspace"  value={invoice.booking?.workspaceName ?? "—"} />
                  <Row label="Plan"       value={invoice.booking?.planType      ?? "—"} />
                  <Row label="Start Date" value={formatDate(invoice.booking?.startDate)} />
                  <Row label="End Date"   value={formatDate(invoice.booking?.endDate)} />
                  <Row label="Seats"      value={invoice.booking?.seatCount ?? "—"} />
                </div>

                <hr className="mhi-divider" />

                {/* Payment */}
                <div className="mhi-section" style={{ marginTop: 28 }}>
                  <p className="mhi-section-title">Payment</p>
                  <Row
                    label="Payment Date"
                    value={invoice.paymentDate ? formatDate(invoice.paymentDate) : "—"}
                  />
                  <Row label="Status" value={
                    invoice.status === "PAID"
                      ? <span style={{ color: "#16a34a", fontWeight: 700 }}>PAID ✓</span>
                      : <span style={{ color: "#d97706", fontWeight: 700 }}>{invoice.status}</span>
                  } />
                </div>

                {/* Total */}
                <div className="mhi-total">
                  <span className="mhi-total__label">Total Amount</span>
                  <span className="mhi-total__amount">{formatNaira(invoice.amount)}</span>
                </div>
              </div>

              {/* ── Footer Actions ── */}
              <hr className="mhi-divider" />
              <div className="mhi-footer">
                <a
                  href={`${API_BASE_URL}/invoices/${invoice.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mhi-btn mhi-btn--primary"
                  aria-label={`Download PDF for invoice ${invoice.invoiceNumber}`}
                >
                  ↓ Download PDF
                </a>
                <Link href="/invoices" className="mhi-btn mhi-btn--outline">
                  ← Back to Invoices
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}