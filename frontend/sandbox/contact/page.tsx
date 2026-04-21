"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CheckCircle,
  AlertCircle,
  Send,
  Loader2,
  X,
  Info,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/utils/cn";

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------
const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Name must be at least 2 characters" }),
  email: z
    .string()
    .trim()
    .min(1, { message: "Email is required" })
    .email({ message: "Please enter a valid email address" }),
  subject: z
    .string()
    .trim()
    .min(5, { message: "Subject must be at least 5 characters" }),
  message: z
    .string()
    .trim()
    .min(20, { message: "Message must be at least 20 characters" }),
});

type ContactFormData = z.infer<typeof contactSchema>;

// ---------------------------------------------------------------------------
// Mock API — swap this function for a real API call later
// ---------------------------------------------------------------------------
function mockSubmit(_data: ContactFormData): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Randomly resolve or reject to exercise both states
      Math.random() > 0.4 ? resolve() : reject(new Error("Server error. Please try again."));
    }, 1500);
  });
}

// ---------------------------------------------------------------------------
// Reusable field wrapper
// ---------------------------------------------------------------------------
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-sm text-red-600">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      {message}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function ContactPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: ContactFormData) => {
    setApiError(null);
    try {
      await mockSubmit(data);
      setIsSubmitted(true);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const handleSendAnother = () => {
    setIsSubmitted(false);
    setApiError(null);
    reset();
  };

  // -------------------------------------------------------------------------
  // Success state
  // -------------------------------------------------------------------------
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="bg-green-100 p-4 rounded-full">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>

          {/* Copy */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">Message Sent!</h2>
            <p className="text-gray-600">
              Thank you, we&apos;ll be in touch.
            </p>
          </div>

          {/* Send another */}
          <button
            onClick={handleSendAnother}
            className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
          >
            Send Another Message
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Form state
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-gray-900 p-3 rounded-xl">
              <MessageSquare className="h-7 w-7 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Get in Touch</h1>
          <p className="text-gray-500 text-sm">
            Fill out the form below and we&apos;ll get back to you as soon as possible.
          </p>
        </div>

        {/* Error banner */}
        {apiError && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="flex-1">{apiError}</span>
            <button
              onClick={() => setApiError(null)}
              aria-label="Dismiss error"
              className="shrink-0 hover:text-red-900 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                placeholder="Your full name"
                {...register("name")}
                className={cn(
                  "w-full px-3 py-3 border rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent transition-all",
                  errors.name ? "border-red-500" : "border-gray-300"
                )}
              />
              <FieldError message={errors.name?.message} />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                {...register("email")}
                className={cn(
                  "w-full px-3 py-3 border rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent transition-all",
                  errors.email ? "border-red-500" : "border-gray-300"
                )}
              />
              <FieldError message={errors.email?.message} />
            </div>

            {/* Subject */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1.5">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                id="subject"
                type="text"
                placeholder="How can we help?"
                {...register("subject")}
                className={cn(
                  "w-full px-3 py-3 border rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent transition-all",
                  errors.subject ? "border-red-500" : "border-gray-300"
                )}
              />
              <FieldError message={errors.subject?.message} />
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1.5">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                id="message"
                rows={5}
                placeholder="Tell us more about your inquiry..."
                {...register("message")}
                className={cn(
                  "w-full px-3 py-3 border rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent transition-all resize-none",
                  errors.message ? "border-red-500" : "border-gray-300"
                )}
              />
              <FieldError message={errors.message?.message} />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Message
                </>
              )}
            </button>

            {/* Rate limit notice */}
            <p className="flex items-center gap-1.5 text-xs text-gray-400 justify-center">
              <Info className="h-3.5 w-3.5 shrink-0" />
              You can send up to 3 messages per hour.
            </p>

          </form>
        </div>
      </div>
    </div>
  );
}
