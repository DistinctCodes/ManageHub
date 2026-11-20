"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ClipboardList, ExternalLink, Search } from "lucide-react";
import {
  listManualReviewPayments,
  type Payment,
  type PaymentStatus,
} from "@/lib/payments-api";
import { listPayments, type PaymentListFilters } from "@/lib/admin-api";
import { formatCurrency, fromMinorUnits } from "@/lib/utils";
import {
  Card,
  CardHeader,
  Badge,
  StatusBadge,
  Field,
  inputClass,
  Button,
  SecondaryButton,
} from "@/components/admin/ui";
import { RequireAdmin } from "@/components/admin/require-admin";

function formatAmount(amount: number, currency: string): string {
  return formatCurrency(fromMinorUnits(amount, currency), currency);
}

const PAGE_SIZE = 25;

const STATUSES: PaymentStatus[] = [
  "INITIATED",
  "AWAITING_CONFIRMATION",
  "CONFIRMED",
  "FAILED",
  "EXPIRED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "MANUAL_REVIEW",
  "DISPUTED",
  "VOIDED",
];

type Tab = "manual" | "all";

interface PaymentFiltersDraft {
  id: string;
  userId: string;
  bookingId: string;
  status: "" | PaymentStatus;
  from: string;
  to: string;
}

const EMPTY_DRAFT: PaymentFiltersDraft = {
  id: "",
  userId: "",
  bookingId: "",
  status: "",
  from: "",
  to: "",
};

export default function AdminPaymentsPage() {
  return (
    <RequireAdmin>
      <PaymentsInner />
    </RequireAdmin>
  );
}

function PaymentsInner() {
  const [tab, setTab] = useState<Tab>("manual");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-6 w-6 text-amber-600" />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
            {tab === "manual" ? "Manual-review queue" : "Payment search"}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {tab === "manual"
              ? "Payments escalated to MANUAL_REVIEW — use the action buttons on each detail page to force-reconcile, resolve, or void."
              : "Find any payment by id, user, booking, status, or creation date."}
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
        <TabButton
          label="Review queue"
          active={tab === "manual"}
          onClick={() => setTab("manual")}
        />
        <TabButton
          label="All payments"
          active={tab === "all"}
          onClick={() => setTab("all")}
        />
      </div>

      {tab === "manual" ? <ManualReviewTable /> : <AllPaymentsTable />}
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`border-b-2 px-4 py-2 text-sm font-medium ${
        active
          ? "border-blue-600 text-blue-700 dark:text-blue-400"
          : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
      }`}
    >
      {label}
    </button>
  );
}

function Pagination({
  offset,
  total,
  onPrevious,
  onNext,
}: {
  offset: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 text-sm dark:border-gray-800">
      <span className="text-gray-500 dark:text-gray-400">
        Showing {total === 0 ? 0 : offset + 1}–
        {Math.min(offset + PAGE_SIZE, total)} of {total}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={offset === 0}
          className="rounded-md border border-gray-200 px-3 py-1 font-medium text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={offset + PAGE_SIZE >= total}
          className="rounded-md border border-gray-200 px-3 py-1 font-medium text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function PaymentRow({
  payment,
  showUser,
  showReason,
}: {
  payment: Payment;
  showUser?: boolean;
  showReason?: boolean;
}) {
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <td className="px-5 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
        {payment.id.slice(0, 8)}…
      </td>
      <td className="px-5 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
        {payment.bookingId.slice(0, 8)}…
      </td>
      {showUser ? (
        <td className="px-5 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
          {payment.userId.slice(0, 8)}…
        </td>
      ) : null}
      <td className="px-5 py-3">
        <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
          {payment.rail}
        </Badge>
      </td>
      <td className="px-5 py-3">
        <StatusBadge status={payment.status} />
      </td>
      <td className="px-5 py-3 text-right tabular-nums">
        {formatAmount(payment.amount, payment.currency)}
      </td>
      {showReason ? (
        <td className="px-5 py-3 max-w-xs truncate text-gray-500 dark:text-gray-400">
          {payment.manualReviewReason ?? "—"}
        </td>
      ) : null}
      <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
        {new Date(payment.createdAt).toLocaleDateString()}
      </td>
      <td className="px-5 py-3">
        <Link
          href={`/admin/payments/${payment.id}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
        >
          Review <ExternalLink className="h-3 w-3" />
        </Link>
      </td>
    </tr>
  );
}

function ManualReviewTable() {
  const [offset, setOffset] = useState(0);
  const { data, isLoading, error } = useQuery({
    queryKey: ["manual-review-payments", offset],
    queryFn: () => listManualReviewPayments(PAGE_SIZE, offset),
    refetchInterval: 30_000,
  });

  const payments = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <Card>
      <CardHeader
        title={isLoading ? "Loading…" : `${total} payment${total === 1 ? "" : "s"} awaiting review`}
        description="Auto-refreshes every 30 seconds."
      />

      {error ? (
        <p className="px-5 py-6 text-sm text-red-600 dark:text-red-400">
          {(error as Error).message}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3">Payment ID</th>
                <th className="px-5 py-3">Booking</th>
                <th className="px-5 py-3">Rail</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3">Review reason</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {payments.map((payment: Payment) => (
                <PaymentRow key={payment.id} payment={payment} showReason />
              ))}
              {!isLoading && payments.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-gray-400">
                    No payments in the manual-review queue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && (
        <Pagination
          offset={offset}
          total={total}
          onPrevious={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
          onNext={() => setOffset((current) => current + PAGE_SIZE)}
        />
      )}
    </Card>
  );
}

function AllPaymentsTable() {
  const [draft, setDraft] = useState<PaymentFiltersDraft>(EMPTY_DRAFT);
  const [filters, setFilters] = useState<PaymentListFilters>({ limit: PAGE_SIZE, offset: 0 });
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["all-payments", filters],
    queryFn: () => listPayments(filters),
    refetchOnWindowFocus: false,
  });

  const payments = data?.items ?? [];
  const total = data?.total ?? 0;
  const offset = filters.offset ?? 0;

  const apply = (event: React.FormEvent) => {
    event.preventDefault();
    setFilters({
      ...(draft.id.trim() ? { id: draft.id.trim() } : {}),
      ...(draft.userId.trim() ? { userId: draft.userId.trim() } : {}),
      ...(draft.bookingId.trim() ? { bookingId: draft.bookingId.trim() } : {}),
      ...(draft.status ? { status: draft.status } : {}),
      ...(draft.from ? { from: draft.from } : {}),
      ...(draft.to ? { to: draft.to } : {}),
      limit: PAGE_SIZE,
      offset: 0,
    });
  };

  const clear = () => {
    setDraft(EMPTY_DRAFT);
    setFilters({ limit: PAGE_SIZE, offset: 0 });
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <form onSubmit={apply} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Payment ID">
            <input
              className={inputClass}
              value={draft.id}
              onChange={(event) => setDraft({ ...draft, id: event.target.value })}
              placeholder="Full payment id"
            />
          </Field>
          <Field label="User ID">
            <input
              className={inputClass}
              value={draft.userId}
              onChange={(event) => setDraft({ ...draft, userId: event.target.value })}
              placeholder="Full user id"
            />
          </Field>
          <Field label="Booking ID">
            <input
              className={inputClass}
              value={draft.bookingId}
              onChange={(event) => setDraft({ ...draft, bookingId: event.target.value })}
              placeholder="Full booking id"
            />
          </Field>
          <Field label="Status">
            <select
              className={inputClass}
              value={draft.status}
              onChange={(event) =>
                setDraft({ ...draft, status: event.target.value as PaymentFiltersDraft["status"] })
              }
            >
              <option value="">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
          <Field label="From">
            <input
              type="date"
              className={inputClass}
              value={draft.from}
              onChange={(event) => setDraft({ ...draft, from: event.target.value })}
            />
          </Field>
          <Field label="To">
            <input
              type="date"
              className={inputClass}
              value={draft.to}
              onChange={(event) => setDraft({ ...draft, to: event.target.value })}
            />
          </Field>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2">
            <Button type="submit" disabled={isFetching}>
              <Search className="h-4 w-4" />
              Search
            </Button>
            <SecondaryButton type="button" onClick={clear}>
              Clear
            </SecondaryButton>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader
          title={isLoading ? "Loading…" : `${total} payment${total === 1 ? "" : "s"} found`}
          description="Newest first, 25 per page."
        />
        {error ? (
          <p className="px-5 py-6 text-sm text-red-600 dark:text-red-400">
            {(error as Error).message}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-5 py-3">Payment ID</th>
                  <th className="px-5 py-3">Booking</th>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Rail</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {payments.map((payment: Payment) => (
                  <PaymentRow key={payment.id} payment={payment} showUser />
                ))}
                {!isLoading && payments.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-gray-400">
                      No payments match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {total > 0 && (
          <Pagination
            offset={offset}
            total={total}
            onPrevious={() =>
              setFilters((current) => ({
                ...current,
                offset: Math.max(0, (current.offset ?? 0) - PAGE_SIZE),
              }))
            }
            onNext={() =>
              setFilters((current) => ({
                ...current,
                offset: (current.offset ?? 0) + PAGE_SIZE,
              }))
            }
          />
        )}
      </Card>
    </div>
  );
}
