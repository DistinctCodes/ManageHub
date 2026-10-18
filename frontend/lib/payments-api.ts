import { request } from "@/lib/http";

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

function apiFetch<T>(
  path: string,
  init?: RequestInit,
  idempotencyKey?: string,
): Promise<T> {
  return request<T>(path, {
    service: "payments",
    method: init?.method,
    body: init?.body,
    idempotencyKey,
    // One extra attempt for idempotent methods on network errors or
    // transient response statuses; request() limits it to GET.
    retriable: true,
  });
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
