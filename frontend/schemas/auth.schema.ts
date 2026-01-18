// frontend/src/schemas/auth.schema.ts
import { z } from "zod";

// Base schema without refinements
const baseRegisterSchema = z.object({
  fullName: z
    .string()
    .min(3, "Full name must be at least 3 characters")
    .max(100, "Full name is too long")
    .regex(/^[a-zA-Z\s]+$/, "Full name can only contain letters and spaces"),
  email: z.email("Invalid email address").toLowerCase(),
  phone: z
    .string()
    .regex(
      /^(\+234|0)[789][01]\d{8}$/,
      "Invalid Nigerian phone number (e.g., 08012345678 or +2348012345678)",
    )
    .transform((val) => {
      if (val.startsWith("0")) {
        return "+234" + val.slice(1);
      }
      return val;
    }),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[@$!%*?&#]/,
      "Password must contain at least one special character (@$!%*?&#)",
    ),
  confirmPassword: z.string(),
  membershipType: z
    .enum(["hot-desk", "dedicated", "private-office"])
    .refine((val) => val !== undefined, {
      message: "Please select a membership type",
    }),
});

// Frontend form schema with password confirmation refinement
export const registerSchema = baseRegisterSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  },
);

export type RegisterFormData = z.infer<typeof registerSchema>;

// Backend payload schema (omit before adding refinements)
export const registerPayloadSchema = baseRegisterSchema.omit({
  confirmPassword: true,
});

export type RegisterPayload = z.infer<typeof registerPayloadSchema>;

// Response type from backend
export interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    userId: string;
    email: string;
    verificationEmailSent: boolean;
  };
}
