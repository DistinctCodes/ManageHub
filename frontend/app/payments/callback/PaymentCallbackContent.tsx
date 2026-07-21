"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { CheckCircle, XCircle, Clock, ArrowLeft } from "lucide-react";

interface PaymentData {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: "pending" | "success" | "failed" | "abandoned";
  description?: string;
  paidAt?: string;
  createdAt: string;
}

type PaymentStatus = PaymentData["status"];

const statusConfig: Record<
  PaymentStatus,
  { icon: typeof CheckCircle; color: string; bg: string; label: string }
> = {
  success: {
    icon: CheckCircle,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    label: "Payment Successful",
  },
  failed: {
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-50",
    label: "Payment Failed",
  },
  abandoned: {
    icon: XCircle,
    color: "text-orange-600",
    bg: "bg-orange-50",
    label: "Payment Abandoned",
  },
  pending: {
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-50",
    label: "Processing Payment",
  },
};

export default function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get("reference");

  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayment = useCallback(async () => {
    if (!reference) {
      setError("No payment reference provided.");
      setLoading(false);
      return;
    }

    try {
      const res = await apiClient.get<{
        success: boolean;
        data: PaymentData;
      }>(`/payments/reference/${reference}`);

      setPayment(res.data);
      setLoading(false);

      if (res.data.status === "pending") {
        setTimeout(fetchPayment, 3000);
      }
    } catch {
      setError("Failed to fetch payment status.");
      setLoading(false);
    }
  }, [reference]);

  useEffect(() => {
    fetchPayment();
  }, [fetchPayment]);

  if (!reference) {
    return (
      <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center px-4">
        <div className="bg-white rounded-xl border border-gray-100 p-8 max-w-md w-full text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-gray-900 mb-2">
            Missing Reference
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            No payment reference was provided. Please check your payment link.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-5 py-2.5 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center px-4">
        <div className="bg-white rounded-xl border border-gray-100 p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-gray-900 mb-2">
            Verifying Payment
          </h1>
          <p className="text-sm text-gray-500">
            Please wait while we confirm your payment...
          </p>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center px-4">
        <div className="bg-white rounded-xl border border-gray-100 p-8 max-w-md w-full text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-gray-900 mb-2">
            Error
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            {error || "Payment not found."}
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-5 py-2.5 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const config = statusConfig[payment.status];
  const StatusIcon = config.icon;

  return (
    <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center px-4">
      <div className="bg-white rounded-xl border border-gray-100 p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div
            className={`w-16 h-16 ${config.bg} rounded-full flex items-center justify-center mx-auto mb-4`}
          >
            <StatusIcon className={`w-8 h-8 ${config.color}`} />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">
            {config.label}
          </h1>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Reference</span>
            <span className="font-mono text-gray-900">{payment.reference}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Amount</span>
            <span className="font-semibold text-gray-900">
              {payment.currency} {payment.amount.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Status</span>
            <span className={`font-medium capitalize ${config.color}`}>
              {payment.status}
            </span>
          </div>
          {payment.description && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Description</span>
              <span className="text-gray-900">{payment.description}</span>
            </div>
          )}
          {payment.paidAt && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Paid At</span>
              <span className="text-gray-900">
                {new Date(payment.paidAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => router.push("/dashboard")}
          className="w-full flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
