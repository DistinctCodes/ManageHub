// frontend/components/auth/membership-type-card.tsx
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface MembershipTypeCardProps {
  type: "hot-desk" | "dedicated" | "private-office";
  selected: boolean;
  onSelect: () => void;
}

const membershipDetails = {
  "hot-desk": {
    title: "Hot Desk",
    price: "₦15,000",
    period: "per month",
    features: [
      "Flexible seating",
      "Access during business hours",
      "High-speed WiFi",
      "Community events",
      "Tea & Coffee",
    ],
    popular: false,
  },
  dedicated: {
    title: "Dedicated Desk",
    price: "₦35,000",
    period: "per month",
    features: [
      "Your own desk",
      "24/7 access",
      "Lockable drawer",
      "High-speed WiFi",
      "Meeting room credits",
      "Mail handling",
    ],
    popular: true,
  },
  "private-office": {
    title: "Private Office",
    price: "₦75,000",
    period: "per month",
    features: [
      "Private lockable office",
      "24/7 access",
      "Dedicated phone line",
      "Premium WiFi",
      "Unlimited meeting rooms",
      "Mail & package handling",
      "Custom branding",
    ],
    popular: false,
  },
};

export function MembershipTypeCard({
  type,
  selected,
  onSelect,
}: MembershipTypeCardProps) {
  const details = membershipDetails[type];

  return (
    <div
      onClick={onSelect}
      className={cn(
        "relative cursor-pointer rounded-lg border-2 p-6 transition-all hover:shadow-lg",
        selected
          ? "border-blue-600 bg-blue-50 shadow-md"
          : "border-gray-200 bg-white hover:border-gray-300",
      )}
    >
      {details.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
            Most Popular
          </span>
        </div>
      )}

      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {details.title}
          </h3>
          <div className="mt-1">
            <span className="text-2xl font-bold text-gray-900">
              {details.price}
            </span>
            <span className="text-sm text-gray-600">/{details.period}</span>
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

      <ul className="space-y-2">
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
