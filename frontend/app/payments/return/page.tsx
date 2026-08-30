"use client";

/**
 * /payments/return — provider redirect landing page (FE-103)
 *
 * Payment providers redirect the user back to this page after a 3DS / hosted-
 * checkout session.  The page:
 *
 *  1. Reads `paymentId` (and optional `status` / `provider` tokens) from the
 *     query string the provider appended to the return URL.
 *  2. Calls POST /payments/:id/verify-return — the backend's documented
 *     "synchronous fast path" that resolves immediately when the provider
 *     webhook has already landed.
 *  3. If verify-return resolves quickly (< FAST_PATH_TIMEOUT_MS) the result is
 *     shown and the user is redirected to the payment detail page.
 *  4. If the call times out (webhook hasn't arrived yet) the page transparently
 *     switches to a polling loop (GET /payments/:id every POLL_INTERVAL_MS)
 *     matching the backend's own documented fallback behaviour.  Polling stops
 *     as soon as the payment leaves AWAITING_CONFIRMATION, or after
 *     MAX_POLL_ATTEMPTS.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { verifyPaymentReturn, getPayment } from "@/lib/payments-api";
import type { Payment } from "@/lib/payments-api";
import { useSessionStore } from "@/lib/stores/session-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// -- tuning constants ---------------------------------------------------------

/** How long to wait for verify-return before switching to polling (ms). */
const FAST_PATH_TIMEOUT_MS = 5_000;

/** Interval between polling attempts (ms). */
const POLL_INTERVAL_MS = 3_000;

/** Maximum number of polling attempts before giving up. */
const MAX_POLL_ATTEMPTS = 20; // ~60 s total

// -- helpers ------------------------------------------------------------------

type Phase =
  | "fast-path"   // calling verify-return
  | "polling"     // fallback: polling GET /payments/:id
  | "success"     // payment confirmed / non-pending terminal status
  | "timeout"     // gave up after MAX_POLL_ATTEMPTS
  | "error"       // hard error (network, 4xx, missing paymentId)
  | "no-id";      // paymentId absent from query string

function terminalStatus(status: string): boolean {
  return [
    "CONFIRMED", "FAILED", "EXPIRED", "REFUNDED",
    "PARTIALLY_REFUNDED", "MANUAL_REVIEW", "DISPUTED", "VOIDED",
  ].includes(status);
}

function statusLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusTone(status: string): string {
  switch (status) {
    case "CONFIRMED":     return "text-green-600 dark:text-green-400";
    case "FAILED":
    case "DISPUTED":
    case "VOIDED":        return "text-red-600 dark:text-red-400";
    case "MANUAL_REVIEW":
    case "EXPIRED":       return "text-amber-600 dark:text-amber-400";
    default:              return "text-gray-600 dark:text-gray-400";
  }
}

// -- component ----------------------------------------------------------------

export default function PaymentReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessToken = useSessionStore((state) => state.accessToken);

  const paymentId =
    searchParams.get("paymentId") ?? searchParams.get("payment_id") ?? "";

  const [phase, setPhase] = useState<Phase>(paymentId ? "fast-path" : "no-id");
  const [payment, setPayment] = useState<Payment | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [pollCount, setPollCount] = useState(0);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  // Auto-redirect to payment detail after success (3 s grace period)
  useEffect(() => {
    if (phase === "success" && payment) {
      const timer = setTimeout(() => {
        router.push(`/payments/${payment.id}`);
      }, 3_000);
      return () => clearTimeout(timer);
    }
  }, [phase, payment, router]);

  // -- polling loop --------------------------------------------------------

  const startPolling = useCallback(
    (id: string, token: string) => {
      let attempt = 0;
      setPhase("polling");

      function poll() {
        attempt += 1;
        setPollCount(attempt);

        getPayment(id, token)
          .then((p) => {
            setPayment(p);
            if (terminalStatus(p.status)) {
              setPhase("success");
            } else if (attempt >= MAX_POLL_ATTEMPTS) {
              setPhase("timeout");
            } else {
              pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
            }
          })
          .catch((err: unknown) => {
            setErrorMessage(
              err instanceof Error ? err.message : "Polling failed.",
            );
            setPhase("error");
          });
      }

      poll();
    },
    [],
  );

  // -- fast path -----------------------------------------------------------

  useEffect(() => {
    if (!paymentId || !accessToken) return;

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // Arm the timeout that triggers the polling fallback
    const timeoutId = setTimeout(() => {
      ctrl.abort();
      startPolling(paymentId, accessToken as string);
    }, FAST_PATH_TIMEOUT_MS);

    verifyPaymentReturn(accessToken as string, paymentId)
      .then((result) => {
        clearTimeout(timeoutId);
        if (ctrl.signal.aborted) return; // timeout already fired, ignore
        setPayment(result.payment);
        if (result.verified || terminalStatus(result.payment.status)) {
          setPhase("success");
        } else {
          // Not yet in a terminal state — fall through to polling
          startPolling(paymentId, accessToken as string);
        }
      })
      .catch((err: unknown) => {
        clearTimeout(timeoutId);
        if (ctrl.signal.aborted) return;
        // Any error from verify-return: fall back gracefully to polling
        console.warn(
          "[verify-return] fast path failed, falling back to polling:",
          err,
        );
        startPolling(paymentId, accessToken as string);
      });

    return () => {
      clearTimeout(timeoutId);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, accessToken]);

  // -- render --------------------------------------------------------------

  if (!accessToken) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-2xl font-semibold mb-6">Verifying Payment</h1>
        <Card>
          <CardContent className="space-y-4 py-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Please sign in to verify your payment.
            </p>
            <Button asChild>
              <Link
                href={`/login?next=/payments/return?paymentId=${paymentId}`}
              >
                Sign in
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (phase === "no-id") {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-2xl font-semibold mb-6">Verifying Payment</h1>
        <Card>
          <CardContent className="space-y-4 py-6">
            <p className="text-sm text-red-600 dark:text-red-400">
              No payment ID was found in the return URL. If you were redirected
              here by a payment provider, please contact support.
            </p>
            <Button variant="outline" asChild>
              <Link href="/payments">&larr; My Payments</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-2xl font-semibold mb-6">Verifying Payment</h1>

      {/* fast-path spinner */}
      {phase === "fast-path" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-gray-700 dark:text-gray-300">
              Checking payment status&hellip;
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <svg
                className="h-5 w-5 animate-spin text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Contacting your payment provider&hellip;
              </p>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Payment ID:{" "}
              <span className="font-mono">{paymentId}</span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* polling fallback spinner */}
      {phase === "polling" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-gray-700 dark:text-gray-300">
              Waiting for confirmation&hellip;
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <svg
                className="h-5 w-5 animate-spin text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                The provider webhook hasn&apos;t arrived yet &mdash; we&apos;re
                polling for your payment status. This usually resolves within a
                few seconds.
              </p>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-amber-400 transition-all duration-500"
                style={{
                  width: `${Math.min(
                    (pollCount / MAX_POLL_ATTEMPTS) * 100,
                    100,
                  )}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Check {pollCount} of {MAX_POLL_ATTEMPTS} &middot; Payment ID:{" "}
              <span className="font-mono">{paymentId}</span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* success */}
      {phase === "success" && payment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <svg
                className="h-5 w-5 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Payment verified
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-gray-500 dark:text-gray-400">Status</dt>
              <dd className={`font-medium ${statusTone(payment.status)}`}>
                {statusLabel(payment.status)}
              </dd>

              <dt className="text-gray-500 dark:text-gray-400">Amount</dt>
              <dd>
                {payment.amount.toFixed(2)} {payment.currency}
              </dd>

              {payment.provider && (
                <>
                  <dt className="text-gray-500 dark:text-gray-400">Provider</dt>
                  <dd>{payment.provider}</dd>
                </>
              )}

              {payment.providerReference && (
                <>
                  <dt className="text-gray-500 dark:text-gray-400">
                    Reference
                  </dt>
                  <dd className="break-all font-mono text-xs">
                    {payment.providerReference}
                  </dd>
                </>
              )}
            </dl>

            <p className="text-xs text-gray-400 dark:text-gray-500">
              Redirecting you to your payment details in a moment&hellip;
            </p>

            <Button asChild size="sm">
              <Link href={`/payments/${payment.id}`}>
                View payment details
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* timeout */}
      {phase === "timeout" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-amber-600 dark:text-amber-400">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
              Confirmation taking longer than expected
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We couldn&apos;t confirm your payment automatically. This
              sometimes happens when payment networks are slow. Your payment has{" "}
              <strong>not</strong> been cancelled &mdash; you can check its
              status on your payments page.
            </p>
            {payment && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Last known status:{" "}
                <span className={`font-medium ${statusTone(payment.status)}`}>
                  {statusLabel(payment.status)}
                </span>
              </p>
            )}
            <div className="flex gap-3">
              <Button asChild size="sm">
                <Link
                  href={paymentId ? `/payments/${paymentId}` : "/payments"}
                >
                  Check payment status
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/payments">&larr; My Payments</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* hard error */}
      {phase === "error" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-red-600 dark:text-red-400">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Verification failed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {errorMessage ||
                "An unexpected error occurred while verifying your payment."}
            </p>
            <div className="flex gap-3">
              <Button asChild size="sm">
                <Link
                  href={paymentId ? `/payments/${paymentId}` : "/payments"}
                >
                  View payment
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/payments">&larr; My Payments</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
