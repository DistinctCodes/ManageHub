import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { error: "Email is required" })
    .and(z.email({ error: "Invalid email address" })),
  password: z
    .string()
    .min(6, { error: "Password must be at least 6 characters" }),
});

export type LoginSchema = z.infer<typeof loginSchema>;
