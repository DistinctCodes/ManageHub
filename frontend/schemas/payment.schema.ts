// frontend/src/schemas/payment.schema.ts
import { z } from "zod";

export enum PaymentPlan {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  YEARLY = "yearly",
}

export const paymentSchema = z.object({
  membershipType: z.enum(["hot-desk", "dedicated", "private-office"]),
  paymentPlan: z.nativeEnum(PaymentPlan),
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: "You must agree to the payment terms",
  }),
});

export type PaymentFormData = z.infer<typeof paymentSchema>;

// Pricing structure
export interface PricingTier {
  daily?: number;
  weekly?: number;
  monthly: number;
  quarterly?: number;
  yearly?: number;
}

export const PRICING: Record<string, PricingTier> = {
  "hot-desk": {
    daily: 2000,
    weekly: 10000,
    monthly: 15000,
    quarterly: 40000,
    yearly: 150000,
  },
  dedicated: {
    weekly: 20000,
    monthly: 35000,
    quarterly: 95000,
    yearly: 350000,
  },
  "private-office": {
    monthly: 75000,
    quarterly: 210000,
    yearly: 800000,
  },
};

// Response types
export interface InitializePaymentResponse {
  success: boolean;
  message: string;
  data: {
    authorizationUrl: string;
    accessCode: string;
    reference: string;
  };
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  data: {
    reference: string;
    amount: number;
    status: string;
    paidAt: string;
  };
}
