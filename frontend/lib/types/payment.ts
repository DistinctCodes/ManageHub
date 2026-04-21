export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
export type PaymentProvider = "PAYSTACK" | "STELLAR";

export interface Payment {
  id: string;
  bookingId: string;
  userId: string;
  amount: number; // kobo
  currency: string;
  provider: PaymentProvider;
  providerReference?: string;
  status: PaymentStatus;
  paidAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface InitializePaymentResponse {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
  paymentId: string;
}
