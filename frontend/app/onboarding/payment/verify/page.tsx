// frontend/src/app/onboarding/payment/verify/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useVerifyPayment } from "@/hooks/use-verify-payment";
import { cn } from "@/lib/utils";

type VerificationStatus = "verifying" | "success" | "failed";

function VerifyPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");

  const [status, setStatus] = useState<VerificationStatus>("verifying");
  const { mutate: verifyPayment } = useVerifyPayment();

  useEffect(() => {
    if (!reference) {
      setStatus("failed");
      return;
    }

    verifyPayment(reference, {
      onSuccess: () => {
        setStatus("success");
      },
      onError: () => {
        setStatus("failed");
      },
    });
  }, [reference, verifyPayment]);

  if (status === "verifying") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-16 w-16 animate-spin text-blue-600" />
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            Verifying Your Payment
          </h1>
          <p className="text-gray-600">
            Please wait while we confirm your payment...
          </p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-green-100 p-4">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
          </div>
          <h1 className="mb-3 text-2xl font-bold text-gray-900">
            Payment Successful!
          </h1>
          <p className="mb-6 text-gray-600">
            Your membership has been activated. Redirecting to biometric
            setup...
          </p>
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-red-100 p-4">
            <XCircle className="h-16 w-16 text-red-600" />
          </div>
        </div>
        <h1 className="mb-3 text-2xl font-bold text-gray-900">
          Payment Verification Failed
        </h1>
        <p className="mb-6 text-gray-600">
          We couldn't verify your payment. Please try again or contact support.
        </p>
        <button
          onClick={() => router.push("/onboarding/payment")}
          className={cn(
            "w-full rounded-lg bg-blue-600 px-6 py-3 text-white font-medium",
            "transition-colors hover:bg-blue-700",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          )}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

export default function VerifyPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <VerifyPaymentContent />
    </Suspense>
  );
}
