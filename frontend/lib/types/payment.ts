export type PaymentStatus = "pending" | "success" | "failed" | "refunded";
export type PaymentProvider = "paystack" | "soroban";

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
  user?: {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
  };
  booking?: {
    id: string;
  };
}

export interface InitializePaymentResponse {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
  paymentId: string;
}
