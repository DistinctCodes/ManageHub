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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function apiFetch<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
  idempotencyKey?: string,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `Request failed (${response.status})`);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

// ── payments (FE-102) ────────────────────────────────────────────────────

export function initiatePayment(
  accessToken: string,
  input: InitiatePaymentInput,
  idempotencyKey: string,
): Promise<Payment> {
  return apiFetch<Payment>("/payments/initiate", accessToken, {
    method: "POST",
    body: JSON.stringify(input),
  }, idempotencyKey);
}

export function getPayments(accessToken: string): Promise<Payment[]> {
  return apiFetch<Payment[]>("/payments", accessToken);
}

export function getPayment(id: string, accessToken: string): Promise<Payment> {
  return apiFetch<Payment>(`/payments/${id}`, accessToken);
}

export function verifyPaymentReturn(
  accessToken: string,
  id: string,
): Promise<{ payment: Payment; verified: boolean }> {
  return apiFetch<{ payment: Payment; verified: boolean }>(
    `/payments/${id}/verify-return`,
    accessToken,
    { method: "POST" },
  );
}

// ── metered usage (FE-109) ───────────────────────────────────────────────

export function listMyUsage(accessToken: string): Promise<MeteredUsageEvent[]> {
  return apiFetch<MeteredUsageEvent[]>("/credits/usage", accessToken);
}

export function listManualReviewPayments(
  accessToken: string,
): Promise<Payment[]> {
  return apiFetch<Payment[]>("/payments/admin/manual-review", accessToken);
}

// ── admin payment actions (FE-104 / FE-106) ──────────────────────────────

export function forceReconcilePayment(
  accessToken: string,
  id: string,
): Promise<Payment> {
  return apiFetch<Payment>(
    `/payments/admin/${id}/force-reconcile`,
    accessToken,
    { method: "POST" },
  );
}

export function resolvePaymentManually(
  accessToken: string,
  id: string,
  resolution: string,
): Promise<Payment> {
  return apiFetch<Payment>(
    `/payments/admin/${id}/resolve-manually`,
    accessToken,
    { method: "POST", body: JSON.stringify({ resolution }) },
  );
}

export function voidPayment(
  accessToken: string,
  id: string,
  reason: string,
): Promise<Payment> {
  return apiFetch<Payment>(
    `/payments/admin/${id}/void`,
    accessToken,
    { method: "POST", body: JSON.stringify({ reason }) },
  );
}

// ── refunds (FE-107) ─────────────────────────────────────────────────────

export function requestRefund(
  accessToken: string,
  paymentId: string,
  amount: number,
  reason: string,
): Promise<RequestRefundResponse> {
  return apiFetch<RequestRefundResponse>(
    `/payments/admin/${paymentId}/refunds`,
    accessToken,
    { method: "POST", body: JSON.stringify({ amount, reason }) },
  );
}

// ── charge credits (FE-110) ──────────────────────────────────────────────

export function chargeCredits(
  accessToken: string,
  input: {
    userId: string;
    amount: number;
    reference: string;
    reason: string;
    currency?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<ChargeCreditsResponse> {
  return apiFetch<ChargeCreditsResponse>("/credits/charge", accessToken, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
