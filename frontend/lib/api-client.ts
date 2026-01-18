// frontend/src/lib/api-client.ts
import {
  RegisterFormData,
  RegisterPayload,
  RegisterResponse,
} from "@/schemas/auth.schema";
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
      .json();
  },
};
