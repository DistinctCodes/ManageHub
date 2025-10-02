import { z } from 'zod';

// Personal Info Schema
export const personalInfoSchema = z.object({
  fullName: z.string()
    .min(1, 'Full name is required')
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters'),
  
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters'),
  
  phoneNumber: z.string()
    .min(1, 'Phone number is required')
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number'),
  
  location: z.string()
    .max(100, 'Location must be less than 100 characters')
    .optional(),
});

// Account Setup Schema
export const accountSetupSchema = z.object({
  userType: z.enum(['member', 'staff', 'visitor'], {
    required_error: 'Please select a user type',
  }),
  
  organizationName: z.string()
    .min(1, 'Organization name is required')
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name must be less than 100 characters'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  
  confirmPassword: z.string()
    .min(1, 'Please confirm your password'),
  
  agreeToTerms: z.boolean()
    .refine((val) => val === true, {
      message: 'You must agree to the terms and conditions',
    }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Complete Registration Schema
export const registrationSchema = personalInfoSchema.merge(accountSetupSchema);

// Type exports
export type PersonalInfoForm = z.infer<typeof personalInfoSchema>;
export type AccountSetupForm = z.infer<typeof accountSetupSchema>;
export type RegistrationForm = z.infer<typeof registrationSchema>;

// Forgot Password Schema
export const forgotPasswordSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters'),
});

export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;
