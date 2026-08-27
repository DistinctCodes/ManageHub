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

export type PaymentRail = "FIAT" | "STELLAR_CUSTODIAL" | "STELLAR_EXTERNAL";

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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function paymentsFetch<T>(
  path: string,
  accessToken: string,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `Payments request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export function getPayments(accessToken: string): Promise<Payment[]> {
  return paymentsFetch<Payment[]>("/payments", accessToken);
}

export function getPayment(
  id: string,
  accessToken: string,
): Promise<Payment> {
  return paymentsFetch<Payment>(`/payments/${id}`, accessToken);
}
