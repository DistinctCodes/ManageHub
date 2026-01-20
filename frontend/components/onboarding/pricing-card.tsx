// frontend/src/components/onboarding/pricing-card.tsx
import { Check, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PricingCardProps {
  type: "hot-desk" | "dedicated" | "private-office";
  plan: string;
  price: number;
  selected: boolean;
  onSelect: () => void;
  popular?: boolean;
}

const membershipDetails = {
  "hot-desk": {
    title: "Hot Desk",
    features: [
      "Flexible seating",
      "Access during business hours (8am - 6pm)",
      "High-speed WiFi",
      "Community events",
      "Tea & Coffee",
    ],
  },
  dedicated: {
    title: "Dedicated Desk",
    features: [
      "Your own desk",
      "24/7 access",
      "Lockable drawer",
      "High-speed WiFi",
      "4 hours meeting room/month",
      "Mail handling",
    ],
  },
  "private-office": {
    title: "Private Office",
    features: [
      "Private lockable office",
      "24/7 access",
      "Dedicated phone line",
      "Premium WiFi",
      "Unlimited meeting rooms",
      "Mail & package handling",
      "Custom branding",
    ],
  },
};

const planLabels: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly (Save 10%)",
  yearly: "Yearly (Save 20%)",
};

export function PricingCard({
  type,
  plan,
  price,
  selected,
  onSelect,
  popular = false,
}: PricingCardProps) {
  const details = membershipDetails[type];

  return (
    <div
      onClick={onSelect}
      className={cn(
        "relative cursor-pointer rounded-xl border-2 p-6 transition-all hover:shadow-lg",
        selected
          ? "border-blue-600 bg-blue-50 shadow-md ring-2 ring-blue-600/20"
          : "border-gray-200 bg-white hover:border-gray-300",
      )}
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg">
            <Crown className="h-3.5 w-3.5" />
            Most Popular
          </span>
        </div>
      )}

      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {details.title}
          </h3>
          <p className="mt-1 text-sm text-gray-600">{planLabels[plan]}</p>
          <div className="mt-2">
            <span className="text-3xl font-bold text-gray-900">
              ₦{price.toLocaleString()}
            </span>
            <span className="text-sm text-gray-600">
              /
              {plan === "yearly"
                ? "year"
                : plan === "quarterly"
                  ? "quarter"
                  : plan === "monthly"
                    ? "month"
                    : plan === "weekly"
                      ? "week"
                      : "day"}
            </span>
          </div>
        </div>

        <div
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full border-2",
            selected
              ? "border-blue-600 bg-blue-600"
              : "border-gray-300 bg-white",
          )}
        >
          {selected && <Check className="h-4 w-4 text-white" />}
        </div>
      </div>

      <ul className="space-y-2.5">
        {details.features.map((feature, index) => (
          <li key={index} className="flex items-start text-sm text-gray-600">
            <Check className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
