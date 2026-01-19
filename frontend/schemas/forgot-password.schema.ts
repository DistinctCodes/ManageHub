// frontend/src/schemas/auth.schema.ts
import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z.email("Invalid email address").toLowerCase(),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// Response type from backend
export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  data: {
    email: string;
    resetEmailSent: boolean;
  };
}
