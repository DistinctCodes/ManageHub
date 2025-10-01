import z from 'zod';

export const forgotPasswordSchema = z.object({
  email: z.email().min(1, 'Email is required').max(255, 'Email is too long'),
});
