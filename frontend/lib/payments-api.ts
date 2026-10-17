import {
  getApiErrorMessage,
  getRequestId,
  reportApiError,
} from "@/lib/api-report";

export type PaymentRail = "FIAT" | "STELLAR_CUSTODIAL" | "STELLAR_EXTERNAL";

export type PaymentStatus =
  | "INITIATED"
  | "AWAITING_CONFIRMATION"
  | "CONFIRMED"
  | "FAILED"
  | "EXPIRED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "MANUAL_REVIEW"
  | "DISPUTED"
  | "VOIDED";

export interface Payment {
  id: string;
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  rail: PaymentRail;
  status: PaymentStatus;
  provider: string | null;
  providerReference: string | null;
  expiresAt: string | null;
  failureReason: string | null;
  reconciliationAttempts: number;
  manualReviewReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InitiatePaymentInput {
  bookingId: string;
  amount: number;
  currency: string;
  rail: PaymentRail;
  provider?: string;
  metadata?: Record<string, unknown>;
}

export interface MeteredUsageEvent {
  id: string;
  userId: string;
  resource: string;
  units: number;
  unitPrice: number;
  amount: number;
  currency: string;
  usageReference: string;
  ledgerTransactionId: string;
  createdAt: string;
  charged?: boolean;
}

export interface LedgerTransaction {
  id: string;
  kind: string;
  reference: string;
  currency: string;
  amount: number;
  description: string | null;
  createdAt: string;
}

export interface ChargeCreditsResponse {
  transaction: LedgerTransaction;
  posted: boolean;
  balanceAfter: number;
  currency: string;
}

export interface Refund {
  id: string;
  paymentId: string;
  amount: number;
  reason: string;
  actorId: string | null;
  createdAt: string;
}

export interface RequestRefundResponse {
  payment: Payment;
  refund: Refund;
}

export interface ManualReviewPage {
  items: Payment[];
  total: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const TRANSIENT_RETRY_DELAY_MS = 250;
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

function isRetryableMethod(init: RequestInit): boolean {
  return (init.method ?? "GET").toUpperCase() === "GET";
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function waitForRetry(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, TRANSIENT_RETRY_DELAY_MS));
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const retryable = isRetryableMethod(init);

  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await fetch(url, init);
      if (
        !retryable ||
        attempt >= 1 ||
        !RETRYABLE_STATUS_CODES.has(response.status)
      ) {
        return response;
      }
      await response.body?.cancel();
    } catch (error) {
      if (!retryable || attempt >= 1 || isAbortError(error)) {
        throw error;
      }
    }

    await waitForRetry();
  }
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  idempotencyKey?: string,
): Promise<T> {
  const requestInit: RequestInit = {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      ...init?.headers,
    },
    // The backend authorizes via its HttpOnly `accessToken` cookie (issue
    // #1975); no bearer header is threaded from the client.
    credentials: "include",
  };
  const response = await fetchWithRetry(`${API_BASE_URL}${path}`, requestInit);

  if (!response.ok) {
    if (response.status === 401) {
      // A rejected session must send the user to login, not leave the stale
      // state in place (issue #1977).
      expireSession();
    }
    const body = await response.json().catch(() => null);
    const error = new Error(
      getApiErrorMessage(body, `Request failed (${response.status})`),
    );

    reportApiError({
      api: "payments",
      method: init?.method ?? "GET",
      pathTemplate: path,
      status: response.status,
      requestId: getRequestId(response),
    });

    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

// ── payments (FE-102) ────────────────────────────────────────────────────

export function initiatePayment(
  input: InitiatePaymentInput,
  idempotencyKey: string,
): Promise<Payment> {
  return apiFetch<Payment>("/payments/initiate", {
    method: "POST",
    body: JSON.stringify(input),
  }, idempotencyKey);
}

export function getPayments(): Promise<Payment[]> {
  return apiFetch<Payment[]>("/payments");
}

export function getPayment(id: string): Promise<Payment> {
  return apiFetch<Payment>(`/payments/${id}`);
}

export function verifyPaymentReturn(
  id: string,
): Promise<{ payment: Payment; verified: boolean }> {
  return apiFetch<{ payment: Payment; verified: boolean }>(
    `/payments/${id}/verify-return`,
    { method: "POST" },
  );
}

// ── metered usage (FE-109) ───────────────────────────────────────────────

export function listMyUsage(): Promise<MeteredUsageEvent[]> {
  return apiFetch<MeteredUsageEvent[]>("/credits/usage");
}

export function listManualReviewPayments(
  limit = 25,
  offset = 0,
): Promise<ManualReviewPage> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  return apiFetch<ManualReviewPage>(
    `/payments/admin/manual-review?${params.toString()}`,
  );
}

// ── admin payment actions (FE-104 / FE-106) ──────────────────────────────

export function forceReconcilePayment(
  id: string,
): Promise<Payment> {
  return apiFetch<Payment>(
    `/payments/admin/${id}/force-reconcile`,
    { method: "POST" },
  );
}

export function resolvePaymentManually(
  id: string,
  resolution: string,
): Promise<Payment> {
  return apiFetch<Payment>(
    `/payments/admin/${id}/resolve-manually`,
    { method: "POST", body: JSON.stringify({ resolution }) },
  );
}

export function voidPayment(
  id: string,
  reason: string,
): Promise<Payment> {
  return apiFetch<Payment>(
    `/payments/admin/${id}/void`,
    { method: "POST", body: JSON.stringify({ reason }) },
  );
}

// ── refunds (FE-107) ─────────────────────────────────────────────────────

export function requestRefund(
  paymentId: string,
  amount: number,
  reason: string,
): Promise<RequestRefundResponse> {
  return apiFetch<RequestRefundResponse>(
    `/payments/admin/${paymentId}/refunds`,
    { method: "POST", body: JSON.stringify({ amount, reason }) },
  );
}

// ── charge credits (FE-110) ──────────────────────────────────────────────

export function chargeCredits(
  input: {
    userId: string;
    amount: number;
    reference: string;
    reason: string;
    currency?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<ChargeCreditsResponse> {
  return apiFetch<ChargeCreditsResponse>("/credits/charge", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
