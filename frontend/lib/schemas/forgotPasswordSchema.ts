import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { error: "Email is required" })
    .and(z.email({ error: "Invalid email address" })),
});

export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;
