// frontend/src/lib/api-client.ts
import {
  RegisterFormData,
  RegisterPayload,
  RegisterResponse,
} from "@/schemas/auth.schema";
import {
  ForgotPasswordFormData,
  ForgotPasswordResponse,
} from "@/schemas/forgot-password.schema";
import { LoginFormData, LoginResponse } from "@/schemas/login.schema";
import {
  InitializePaymentResponse,
  VerifyPaymentResponse,
} from "@/schemas/payment.schema";
import { ResetPasswordResponse } from "@/schemas/reset-password.schema";
import ky from "ky";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6001/api";

export const apiClient = ky.create({
  prefixUrl: API_URL,
  timeout: 30000,
  retry: {
    limit: 2,
    methods: ["post"],
    statusCodes: [408, 413, 429, 500, 502, 503, 504],
  },
  hooks: {
    beforeRequest: [
      (request) => {
        // Add any default headers
        request.headers.set("Content-Type", "application/json");

        if (typeof window !== "undefined") {
          const authStorage = localStorage.getItem("auth-storage");
          if (authStorage) {
            try {
              const { state } = JSON.parse(authStorage);
              if (state?.tokens?.accessToken) {
                request.headers.set(
                  "Authorization",
                  `Bearer ${state.tokens.accessToken}`,
                );
              }
            } catch (error) {
              console.error("Error parsing auth storage:", error);
            }
          }
        }
      },
    ],
    afterResponse: [
      async (_request, _options, response) => {
        // Log errors for debugging
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          console.error("API Error:", error);
        }
      },
    ],
  },
});

// Response types
interface ResendVerificationResponse {
  success: boolean;
  message: string;
  data: {
    emailSent: boolean;
  };
}

// Add new response type
interface VerifyEmailResponse {
  success: boolean;
  message: string;
  data: {
    email: string;
    verified: boolean;
  };
}

// API endpoints
export const authApi = {
  register: async (data: RegisterPayload) => {
    return apiClient
      .post("auth/register", { json: data })
      .json<RegisterResponse>();
  },

  resendVerification: async (email: string) => {
    return apiClient
      .post("auth/resend-verification", { json: { email } })
      .json<ResendVerificationResponse>();
  },

  verifyEmail: async (token: string) => {
    return apiClient
      .post("auth/verify-email", {
        json: { token },
      })
      .json<VerifyEmailResponse>();
  },

  login: async (data: LoginFormData) => {
    return apiClient.post("auth/login", { json: data }).json<LoginResponse>();
  },

  forgotPassword: async (data: ForgotPasswordFormData) => {
    return apiClient
      .post("auth/forgot-password", {
        json: data,
      })
      .json<ForgotPasswordResponse>();
  },

  resetPassword: async (token: string, password: string) => {
    return apiClient
      .post("auth/reset-password", {
        json: { token, password },
      })
      .json<ResetPasswordResponse>();
  },
};

// payment API Endpoints
export const paymentApi = {
  initializePayment: async (params: {
    membershipType: string;
    paymentPlan: string;
    amount: number;
  }) => {
    return apiClient
      .post("payments/initialize", {
        json: params,
      })
      .json<InitializePaymentResponse>();
  },

  verifyPayment: async (reference: string) => {
    return apiClient
      .get(`payments/verify/${reference}`)
      .json<VerifyPaymentResponse>();
  },
};
