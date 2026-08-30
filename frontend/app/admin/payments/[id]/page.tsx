"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import {
  getPayment,
  forceReconcilePayment,
  resolvePaymentManually,
  voidPayment,
} from "@/lib/payments-api";
import {
  Card,
  CardHeader,
  Badge,
  StatusBadge,
  Button,
} from "@/components/admin/ui";
import { RequireAdmin, useAdminToken } from "@/components/admin/require-admin";

export default function AdminPaymentDetailPage() {
  const token = useAdminToken();
  return (
    <RequireAdmin>
      <PaymentDetailInner token={token as string} />
    </RequireAdmin>
  );
}

function ConfirmDialog({
  title,
  description,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel,
  needsReason,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  confirmClass?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  needsReason?: boolean;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">
              {title}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          </div>
        </div>
        {needsReason && (
          <div className="mt-4">
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Reason / resolution (required)
            </label>
            <input
              type="text"
              placeholder="Enter reason…"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-50"
            />
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(value)}
            disabled={needsReason && !value.trim()}
            className={
              confirmClass ??
              "rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

type Action = "reconcile" | "resolve" | "void" | null;

function PaymentDetailInner({ token }: { token: string }) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<Action>(null);

  const {
    data: payment,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["payment", id],
    queryFn: () => getPayment(id, token),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["payment", id] });
    queryClient.invalidateQueries({ queryKey: ["manual-review-payments"] });
  };

  const reconcile = useMutation({
    mutationFn: () => forceReconcilePayment(token, id),
    onSuccess: () => {
      invalidate();
      toast.success("Payment force-reconciled.");
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const resolve = useMutation({
    mutationFn: (resolution: string) =>
      resolvePaymentManually(token, id, resolution),
    onSuccess: () => {
      invalidate();
      toast.success("Payment resolved manually.");
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const voidMut = useMutation({
    mutationFn: (reason: string) => voidPayment(token, id, reason),
    onSuccess: () => {
      invalidate();
      toast.success("Payment voided.");
    },
    onError: (err) => toast.error((err as Error).message),
  });

  if (isLoading)
    return <p className="text-sm text-gray-500">Loading payment…</p>;
  if (error || !payment)
    return (
      <p className="text-sm text-red-500">
        {(error as Error)?.message ?? "Payment not found."}
      </p>
    );

  const fields: Array<{ label: string; value: React.ReactNode }> = [
    {
      label: "Payment ID",
      value: <span className="font-mono text-xs">{payment.id}</span>,
    },
    {
      label: "Booking ID",
      value: <span className="font-mono text-xs">{payment.bookingId}</span>,
    },
    {
      label: "User ID",
      value: <span className="font-mono text-xs">{payment.userId}</span>,
    },
    {
      label: "Amount",
      value: `${payment.amount.toLocaleString()} ${payment.currency}`,
    },
    {
      label: "Rail",
      value: (
        <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
          {payment.rail}
        </Badge>
      ),
    },
    { label: "Status", value: <StatusBadge status={payment.status} /> },
    { label: "Provider", value: payment.provider ?? "—" },
    { label: "Provider ref.", value: payment.providerReference ?? "—" },
    { label: "Recon attempts", value: payment.reconciliationAttempts },
    { label: "Review reason", value: payment.manualReviewReason ?? "—" },
    { label: "Failure reason", value: payment.failureReason ?? "—" },
    { label: "Created", value: new Date(payment.createdAt).toLocaleString() },
    { label: "Updated", value: new Date(payment.updatedAt).toLocaleString() },
  ];

  return (
    <>
      {pendingAction === "reconcile" && (
        <ConfirmDialog
          title="Force-reconcile payment"
          description="This will immediately trigger a reconciliation pass for this payment. This action is irreversible."
          confirmLabel="Force-reconcile"
          onConfirm={() => {
            reconcile.mutate();
            setPendingAction(null);
          }}
          onCancel={() => setPendingAction(null)}
        />
      )}
      {pendingAction === "resolve" && (
        <ConfirmDialog
          title="Resolve payment manually"
          description="Mark this payment as manually resolved. Provide a resolution note. Irreversible."
          confirmLabel="Resolve"
          needsReason
          onConfirm={(val) => {
            resolve.mutate(val);
            setPendingAction(null);
          }}
          onCancel={() => setPendingAction(null)}
        />
      )}
      {pendingAction === "void" && (
        <ConfirmDialog
          title="Void payment"
          description="Voiding will permanently cancel this payment. Provide a reason. This cannot be undone."
          confirmLabel="Void payment"
          confirmClass="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          needsReason
          onConfirm={(val) => {
            voidMut.mutate(val);
            setPendingAction(null);
          }}
          onCancel={() => setPendingAction(null)}
        />
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
              Payment detail
            </h1>
          </div>
          <Link
            href="/admin/payments"
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            ← Review queue
          </Link>
        </div>

        <Card>
          <CardHeader
            title="Payment information"
            description="Full details for this payment record."
          />
          <dl className="divide-y divide-gray-100 dark:divide-gray-800">
            {fields.map(({ label, value }) => (
              <div key={label} className="flex px-5 py-3 text-sm">
                <dt className="w-44 shrink-0 font-medium text-gray-500 dark:text-gray-400">
                  {label}
                </dt>
                <dd className="text-gray-900 dark:text-gray-50">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <CardHeader
            title="Admin recovery actions"
            description="These state transitions are irreversible — a confirmation prompt will appear before each action."
          />
          <div className="flex flex-wrap gap-3 px-5 py-5">
            <Button
              type="button"
              onClick={() => setPendingAction("reconcile")}
              disabled={reconcile.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              Force-reconcile
            </Button>
            <Button
              type="button"
              onClick={() => setPendingAction("resolve")}
              disabled={resolve.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle className="h-4 w-4" />
              Resolve manually
            </Button>
            <Button
              type="button"
              onClick={() => setPendingAction("void")}
              disabled={voidMut.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              <XCircle className="h-4 w-4" />
              Void payment
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
