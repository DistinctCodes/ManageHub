"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useGetWorkspaceById } from "@/lib/react-query/hooks/workspaces/useGetWorkspaceById";
import { useGetWorkspaces } from "@/lib/react-query/hooks/workspaces/useGetWorkspaces";
import { useCreateBooking } from "@/lib/react-query/hooks/bookings/useCreateBooking";
import { usePriceEstimate } from "@/lib/react-query/hooks/bookings/usePriceEstimate";
import { useInitializePayment } from "@/lib/react-query/hooks/payments/useInitializePayment";
import { PlanType } from "@/lib/types/booking";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  CalendarDays,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";

const PLAN_TYPES: { value: PlanType; label: string; desc: string }[] = [
  { value: "HOURLY", label: "Hourly", desc: "Pay per hour" },
  { value: "DAILY", label: "Daily", desc: "Full day access" },
  { value: "WEEKLY", label: "Weekly", desc: "7-day access" },
  { value: "MONTHLY", label: "Monthly", desc: "30-day access" },
  { value: "QUARTERLY", label: "Quarterly", desc: "90-day access" },
  { value: "YEARLY", label: "Yearly", desc: "365-day access" },
];

const STEPS = ["Details", "Review", "Payment"];

declare global {
  interface Window {
    PaystackPop: {
      setup: (opts: {
        key: string;
        email: string;
        amount: number;
        ref: string;
        onClose: () => void;
        callback: (response: { reference: string }) => void;
      }) => { openIframe: () => void };
    };
  }
}

export default function BookingForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedId = searchParams.get("workspaceId") ?? "";

  const [step, setStep] = useState(0);
  const [workspaceId, setWorkspaceId] = useState(preselectedId);
  const [planType, setPlanType] = useState<PlanType>("DAILY");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [seatCount, setSeatCount] = useState(1);
  const [notes, setNotes] = useState("");
  const [bookingId, setBookingId] = useState<string | null>(null);

  const { data: workspaceData } = useGetWorkspaceById(workspaceId);
  const workspace = workspaceData?.data;

  const { data: allWorkspacesData } = useGetWorkspaces(
    preselectedId ? {} : { limit: 100 }
  );
  const allWorkspaces = allWorkspacesData?.data ?? [];

  const estimateParams =
    workspaceId && planType && startDate && endDate && seatCount
      ? { workspaceId, planType, startDate, endDate, seatCount }
      : null;

  const { data: estimateData, isFetching: estimatingPrice } =
    usePriceEstimate(estimateParams);

  const totalAmount = estimateData?.data?.totalAmount ?? 0;
  const totalNaira = (totalAmount / 100).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
  });

  const { mutateAsync: createBooking, isPending: creatingBooking } =
    useCreateBooking();
  const { mutateAsync: initializePayment, isPending: initializingPayment } =
    useInitializePayment();

  // Inject Paystack script once
  useEffect(() => {
    if (document.getElementById("paystack-script")) return;
    const script = document.createElement("script");
    script.id = "paystack-script";
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const today = new Date().toISOString().split("T")[0];

  const canProceedStep0 =
    workspaceId && planType && startDate && endDate && seatCount > 0;

  async function handleConfirmBooking() {
    if (!canProceedStep0) return;
    try {
      const res = await createBooking({
        workspaceId,
        planType,
        startDate,
        endDate,
        seatCount,
        notes: notes || undefined,
      });
      setBookingId(res.data.id);
      setStep(2);
    } catch {
      // error toast handled in hook
    }
  }

  async function handlePay() {
    if (!bookingId) return;
    try {
      const res = await initializePayment(bookingId);
      const { accessCode, reference } = res.data;

      if (!window.PaystackPop) {
        // Fallback to redirect
        window.location.href = res.data.authorizationUrl;
        return;
      }

      const handler = window.PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
        email: "", // filled by Paystack via access_code
        amount: totalAmount,
        ref: reference,
        onClose: () => toast.info("Payment window closed"),
        callback: () => {
          toast.success("Payment submitted! Your booking will be confirmed shortly.");
          router.push("/bookings");
        },
      });
      // Use access_code to avoid needing user email again
      void accessCode;
      handler.openIframe();
    } catch {
      // error toast handled in hook
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
                i < step
                  ? "bg-gray-900 text-white"
                  : i === step
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span
              className={`ml-2 text-sm font-medium ${
                i === step ? "text-gray-900" : "text-gray-400"
              }`}
            >
              {s}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-4 h-px flex-1 w-12 ${
                  i < step ? "bg-gray-900" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Details */}
      {step === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
          {/* Workspace select (only shown if no preselection) */}
          {!preselectedId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Workspace <span className="text-red-500">*</span>
              </label>
              <select
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 bg-white"
              >
                <option value="">Select a workspace</option>
                {allWorkspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Show selected workspace name */}
          {workspace && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <CalendarDays className="w-4 h-4 text-gray-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {workspace.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(workspace.hourlyRate / 100).toLocaleString("en-NG", {
                    style: "currency",
                    currency: "NGN",
                    maximumFractionDigits: 0,
                  })}{" "}
                  / hr · {workspace.totalSeats} seats
                </p>
              </div>
              <Link
                href="/workspaces"
                className="ml-auto text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Change
              </Link>
            </div>
          )}

          {/* Plan type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Plan <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PLAN_TYPES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPlanType(p.value)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    planType === p.value
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <p className="text-sm font-medium">{p.label}</p>
                  <p
                    className={`text-xs mt-0.5 ${
                      planType === p.value ? "text-gray-300" : "text-gray-400"
                    }`}
                  >
                    {p.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                min={today}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate || today}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>
          </div>

          {/* Seats */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Number of Seats <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSeatCount((s) => Math.max(1, s - 1))}
                className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
              >
                −
              </button>
              <span className="w-10 text-center text-sm font-semibold text-gray-900">
                {seatCount}
              </span>
              <button
                type="button"
                onClick={() =>
                  setSeatCount((s) =>
                    Math.min(workspace?.totalSeats ?? 99, s + 1)
                  )
                }
                className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
              >
                +
              </button>
              {workspace && (
                <span className="text-xs text-gray-400 ml-1">
                  max {workspace.totalSeats}
                </span>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any special requirements..."
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 resize-none"
            />
          </div>

          {/* Price estimate */}
          {estimateParams && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Estimated total</span>
              <span className="text-sm font-bold text-gray-900">
                {estimatingPrice ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : totalAmount > 0 ? (
                  totalNaira
                ) : (
                  "—"
                )}
              </span>
            </div>
          )}

          <button
            onClick={() => setStep(1)}
            disabled={!canProceedStep0}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue to review
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 1: Review */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
          <h2 className="text-sm font-semibold text-gray-900">
            Review your booking
          </h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Workspace</span>
              <span className="font-medium text-gray-900">
                {workspace?.name ?? workspaceId}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Plan</span>
              <span className="font-medium text-gray-900">{planType}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Dates</span>
              <span className="font-medium text-gray-900">
                {startDate} → {endDate}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Seats</span>
              <span className="font-medium text-gray-900">{seatCount}</span>
            </div>
            {notes && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Notes</span>
                <span className="font-medium text-gray-900 text-right max-w-[60%]">
                  {notes}
                </span>
              </div>
            )}
            <div className="flex justify-between py-3">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-bold text-gray-900 text-base">
                {totalAmount > 0 ? totalNaira : "—"}
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Your booking will be created as <strong>PENDING</strong>. You will
            be redirected to payment immediately after.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(0)}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={handleConfirmBooking}
              disabled={creatingBooking}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-40"
            >
              {creatingBooking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Confirm & proceed to payment
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Payment */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
          <div className="flex items-center justify-center w-14 h-14 bg-green-50 rounded-full mx-auto">
            <CreditCard className="w-7 h-7 text-green-600" />
          </div>

          <div className="text-center">
            <h2 className="text-base font-semibold text-gray-900">
              Complete Payment
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Your booking is reserved. Pay now to confirm it.
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Workspace</span>
              <span className="font-medium">{workspace?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Amount</span>
              <span className="font-bold text-gray-900">{totalNaira}</span>
            </div>
          </div>

          <button
            onClick={handlePay}
            disabled={initializingPayment}
            className="flex items-center justify-center gap-2 w-full py-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-40"
          >
            {initializingPayment ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Pay {totalNaira}
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-400">
            Secured by Paystack · You can also{" "}
            <Link href="/bookings" className="underline">
              pay later from My Bookings
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
