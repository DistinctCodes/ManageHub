import { z } from "zod";

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { error: "Name must be at least 2 characters" }),
    email: z
      .string()
      .trim()
      .min(1, { error: "Email is required" })
      .and(z.email({ error: "Invalid email address" })),
    password: z
      .string()
      .min(6, { error: "Password must be at least 6 characters" }),
    confirmPassword: z
      .string()
      .min(6, { error: "Password must be at least 6 characters" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    error: "Passwords must match",
  });

export type RegisterSchema = z.infer<typeof registerSchema>;
