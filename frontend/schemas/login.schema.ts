// frontend/src/schemas/login.schema.ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Invalid email address").toLowerCase(),

  password: z.string().min(1, "Password is required"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Response type from backend
export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      id: string;
      fullName: string;
      email: string;
      phone: string;
      membershipType: string;
      role: string;
      status: string;
      emailVerified: boolean;
      profilePicture: string | null;
      stellarWalletAddress: string | null;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };
}
