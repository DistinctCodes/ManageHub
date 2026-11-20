"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelPayment, getPayment } from "@/lib/payments-api";
import { useSessionStore } from "@/lib/stores/session-store";
import { usePaymentStatus } from "@/lib/use-payment-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, fromMinorUnits } from "@/lib/utils";

// Payment amounts arrive as integer minor units.
function formatAmount(
  amount: number,
  currency: string,
  exponent?: number,
): string {
  return formatCurrency(
    fromMinorUnits(amount, currency, exponent),
    currency,
    undefined,
    exponent,
  );
}

function statusTone(status: string): string {
  switch (status) {
    case "CONFIRMED":
      return "text-green-600 dark:text-green-400";
    case "FAILED":
    case "DISPUTED":
      return "text-red-600 dark:text-red-400";
    case "MANUAL_REVIEW":
      return "text-amber-600 dark:text-amber-400";
    default:
      return "text-gray-600 dark:text-gray-400";
  }
}

export default function PaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const accessToken = useSessionStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  const {
    data: payment,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["payments", "detail", id],
    queryFn: () => getPayment(id),
    enabled: Boolean(accessToken && id),
  });

  const cancel = useMutation({
    mutationFn: () => cancelPayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", "detail", id] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });

  usePaymentStatus(id, accessToken);

  if (!accessToken) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold mb-6">Payment</h1>
        <Card>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Sign in to see this payment.
            </p>
            <Button asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/payments"
        className="text-sm text-gray-500 underline dark:text-gray-400"
      >
        &larr; Back to payments
      </Link>
      <h1 className="mt-4 text-2xl font-semibold mb-6">Payment</h1>

      {isLoading && (
        <Card>
          <CardContent>Loading payment...</CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="text-sm text-red-600 dark:text-red-400">
            {error.message}
          </CardContent>
        </Card>
      )}

      {payment && (
        <Card>
          <CardHeader>
            <CardTitle>
              {formatAmount(
                payment.amount,
                payment.currency,
                payment.currencyExponent,
              )}{" "}
              <span className={`ml-2 font-medium ${statusTone(payment.status)}`}>
                {payment.status}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Rail</dt>
                <dd>{payment.rail}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Booking</dt>
                <dd>{payment.bookingId}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Created</dt>
                <dd>{new Date(payment.createdAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Updated</dt>
                <dd>{new Date(payment.updatedAt).toLocaleString()}</dd>
              </div>
              {payment.provider && (
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">Provider</dt>
                  <dd>{payment.provider}</dd>
                </div>
              )}
              {payment.providerReference && (
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">
                    Provider reference
                  </dt>
                  <dd className="break-all font-mono text-xs">
                    {payment.providerReference}
                  </dd>
                </div>
              )}
              {payment.failureReason && (
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">
                    Failure reason
                  </dt>
                  <dd className="text-red-600 dark:text-red-400">
                    {payment.failureReason}
                  </dd>
                </div>
              )}
              {payment.manualReviewReason && (
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">
                    Manual review reason
                  </dt>
                  <dd>{payment.manualReviewReason}</dd>
                </div>
              )}
            </div>

            {(payment.status === "INITIATED" ||
              payment.status === "AWAITING_CONFIRMATION") && (
              <div className="pt-2">
                <Button
                  variant="destructive"
                  onClick={() => cancel.mutate()}
                  disabled={cancel.isPending}
                >
                  {cancel.isPending ? "Cancelling..." : "Cancel payment"}
                </Button>
                {cancel.error && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {cancel.error.message}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
