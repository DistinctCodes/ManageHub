// frontend/src/app/onboarding/payment/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  Loader2,
  CreditCard,
  ShieldCheck,
  ArrowRight,
  Info,
  AlertCircle,
} from "lucide-react";
import {
  PaymentFormData,
  paymentSchema,
  PaymentPlan,
  PRICING,
} from "@/schemas/payment.schema";
import { useInitializePayment } from "@/hooks/use-initialize-payment";
import { useUser, useIsAuthenticated } from "@/store/auth-store";
import { PricingCard } from "@/components/onboarding/pricing-card";
import { cn } from "@/lib/utils";

// Paystack Script Loader
declare global {
  interface Window {
    PaystackPop: any;
  }
}

export default function PaymentOnboardingPage() {
  const router = useRouter();
  const user = useUser();
  const isAuthenticated = useIsAuthenticated();

  const [paystackLoaded, setPaystackLoaded] = useState(false);
  const { mutate: initializePayment, isPending } = useInitializePayment();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      membershipType:
        (user?.membershipType as "hot-desk" | "dedicated" | "private-office") ||
        "hot-desk",
      paymentPlan: PaymentPlan.MONTHLY,
      agreeToTerms: false,
    },
  });

  const selectedMembershipType = watch("membershipType");
  const selectedPaymentPlan = watch("paymentPlan");

  // Redirect if not authenticated
  //   useEffect(() => {
  //     if (!isAuthenticated) {
  //       router.push("/auth/login");
  //     }
  //   }, [isAuthenticated, router]);

  // Load Paystack script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => setPaystackLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Calculate selected price
  const selectedPrice =
    PRICING[selectedMembershipType]?.[
      selectedPaymentPlan as keyof (typeof PRICING)[typeof selectedMembershipType]
    ] || 0;

  // Available plans for selected membership type
  const availablePlans = Object.keys(PRICING[selectedMembershipType] || {});

  const onSubmit = (data: PaymentFormData) => {
    if (!paystackLoaded) {
      alert("Payment system is loading. Please try again.");
      return;
    }

    initializePayment(
      {
        membershipType: data.membershipType,
        paymentPlan: data.paymentPlan,
        amount: selectedPrice,
      },
      {
        onSuccess: (response) => {
          // Open Paystack payment modal
          const handler = window.PaystackPop.setup({
            key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
            email: user?.email,
            amount: selectedPrice * 100, // Paystack expects amount in kobo
            currency: "NGN",
            ref: response.data.reference,
            metadata: {
              custom_fields: [
                {
                  display_name: "User ID",
                  variable_name: "user_id",
                  value: user?.id,
                },
                {
                  display_name: "Membership Type",
                  variable_name: "membership_type",
                  value: data.membershipType,
                },
                {
                  display_name: "Payment Plan",
                  variable_name: "payment_plan",
                  value: data.paymentPlan,
                },
              ],
            },
            onClose: function () {
              console.log("Payment window closed");
            },
            callback: function (response: any) {
              // Payment successful, verify on backend
              router.push(
                `/onboarding/payment/verify?reference=${response.reference}`,
              );
            },
          });

          handler.openIframe();
        },
      },
    );
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-3 text-3xl font-bold text-gray-900">
              Complete Your Membership
            </h1>
            <p className="text-lg text-gray-600">
              Choose your payment plan to activate your{" "}
              {user.membershipType.replace("-", " ")} membership
            </p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mx-auto mb-8 max-w-2xl">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white">
                <span className="text-sm font-semibold">✓</span>
              </div>
              <span className="mt-2 text-xs font-medium text-gray-600">
                Account Created
              </span>
            </div>
            <div className="h-1 flex-1 bg-blue-600"></div>
            <div className="flex flex-col items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white">
                <span className="text-sm font-semibold">2</span>
              </div>
              <span className="mt-2 text-xs font-medium text-blue-600">
                Payment
              </span>
            </div>
            <div className="h-1 flex-1 bg-gray-300"></div>
            <div className="flex flex-col items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300 text-gray-600">
                <span className="text-sm font-semibold">3</span>
              </div>
              <span className="mt-2 text-xs font-medium text-gray-600">
                Biometric Setup
              </span>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mx-auto max-w-6xl space-y-8"
        >
          {/* Membership Type Selection */}
          <div className="rounded-xl bg-white p-6 shadow-sm md:p-8">
            <h2 className="mb-6 text-xl font-semibold text-gray-900">
              1. Select Membership Type
            </h2>

            <div className="grid gap-4 md:grid-cols-3">
              {(["hot-desk", "dedicated", "private-office"] as const).map(
                (type) => (
                  <label
                    key={type}
                    className={cn(
                      "cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-md",
                      selectedMembershipType === type
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 bg-white",
                    )}
                  >
                    <input
                      {...register("membershipType")}
                      type="radio"
                      value={type}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">
                        {type
                          .split("-")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1),
                          )
                          .join(" ")}
                      </span>
                      <div
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full border-2",
                          selectedMembershipType === type
                            ? "border-blue-600 bg-blue-600"
                            : "border-gray-300 bg-white",
                        )}
                      >
                        {selectedMembershipType === type && (
                          <div className="h-2 w-2 rounded-full bg-white"></div>
                        )}
                      </div>
                    </div>
                  </label>
                ),
              )}
            </div>
          </div>

          {/* Payment Plan Selection */}
          <div className="rounded-xl bg-white p-6 shadow-sm md:p-8">
            <h2 className="mb-6 text-xl font-semibold text-gray-900">
              2. Choose Payment Plan
            </h2>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {availablePlans.map((plan, index) => {
                const price =
                  PRICING[selectedMembershipType][
                    plan as keyof (typeof PRICING)[typeof selectedMembershipType]
                  ];
                if (!price) return null;

                return (
                  <PricingCard
                    key={plan}
                    type={selectedMembershipType as any}
                    plan={plan}
                    price={price}
                    selected={selectedPaymentPlan === plan}
                    onSelect={() =>
                      setValue("paymentPlan", plan as PaymentPlan)
                    }
                    popular={plan === "monthly"}
                  />
                );
              })}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="rounded-xl bg-white p-6 shadow-sm md:p-8">
            <h2 className="mb-6 text-xl font-semibold text-gray-900">
              3. Payment Summary
            </h2>

            <div className="space-y-4">
              {/* Summary Details */}
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Membership Type:</span>
                    <span className="font-medium text-gray-900">
                      {selectedMembershipType
                        .split("-")
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(" ")}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Payment Plan:</span>
                    <span className="font-medium text-gray-900">
                      {selectedPaymentPlan.charAt(0).toUpperCase() +
                        selectedPaymentPlan.slice(1)}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between">
                      <span className="text-base font-semibold text-gray-900">
                        Total Amount:
                      </span>
                      <span className="text-2xl font-bold text-blue-600">
                        ₦{selectedPrice.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start">
                  <Info className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium">Secure Payment with Paystack</p>
                    <p className="mt-1 text-blue-800">
                      Your payment is processed securely through Paystack. We
                      accept debit cards, bank transfers, and USSD.
                    </p>
                  </div>
                </div>
              </div>

              {/* Terms Agreement */}
              <div className="space-y-4">
                <div className="flex items-start">
                  <input
                    {...register("agreeToTerms")}
                    type="checkbox"
                    id="agreeToTerms"
                    className={cn(
                      "mt-1 h-4 w-4 rounded border-gray-300 text-blue-600",
                      "focus:ring-2 focus:ring-blue-500/20",
                      errors.agreeToTerms && "border-red-500",
                    )}
                  />
                  <label
                    htmlFor="agreeToTerms"
                    className="ml-3 text-sm text-gray-700"
                  >
                    I agree to the{" "}
                    <a
                      href="/terms"
                      target="_blank"
                      className="text-blue-600 hover:underline"
                    >
                      payment terms
                    </a>{" "}
                    and understand that my membership will be activated upon
                    successful payment.
                  </label>
                </div>
                {errors.agreeToTerms && (
                  <p className="ml-7 text-sm text-red-600">
                    {errors.agreeToTerms.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isPending || !paystackLoaded}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-4 text-white font-medium",
                  "transition-colors hover:bg-blue-700",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                )}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : !paystackLoaded ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading payment system...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" />
                    Proceed to Payment (₦{selectedPrice.toLocaleString()})
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Security Badge */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            <span>Secured by Paystack • SSL Encrypted</span>
          </div>
        </form>

        {/* Help Section */}
        <div className="mx-auto mt-8 max-w-4xl rounded-lg bg-gray-50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Frequently Asked Questions
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-gray-900">
                Can I change my plan later?
              </p>
              <p className="mt-1 text-gray-600">
                Yes, you can upgrade or downgrade your membership plan at any
                time from your dashboard.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900">
                What payment methods are accepted?
              </p>
              <p className="mt-1 text-gray-600">
                We accept all major debit cards (Visa, Mastercard, Verve), bank
                transfers, and USSD payments through Paystack.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900">
                Is there a refund policy?
              </p>
              <p className="mt-1 text-gray-600">
                We offer a 7-day money-back guarantee if you're not satisfied
                with our service.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
