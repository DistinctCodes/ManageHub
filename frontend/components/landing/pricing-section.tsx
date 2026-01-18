// frontend/src/components/landing/pricing-section.tsx
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const pricingPlans = [
  {
    name: "Hot Desk",
    price: 15000,
    period: "month",
    description: "Perfect for freelancers and remote workers",
    features: [
      "Access to shared workspace",
      "High-speed WiFi",
      "2 hours meeting room/month",
      "Coffee & tea",
      "Community events access",
      "Mail handling",
    ],
    cta: "Start Free Trial",
    ctaLink: "/auth/register?plan=hot-desk",
    popular: false,
  },
  {
    name: "Dedicated Desk",
    price: 35000,
    period: "month",
    description: "Ideal for growing teams and startups",
    features: [
      "Everything in Hot Desk",
      "Reserved dedicated desk",
      "Personal storage locker",
      "5 hours meeting room/month",
      "24/7 workspace access",
      "Printing credits (100 pages)",
      "Priority support",
    ],
    cta: "Get Started",
    ctaLink: "/auth/register?plan=dedicated",
    popular: true,
  },
  {
    name: "Private Office",
    price: 75000,
    period: "month",
    description: "Best for established businesses",
    features: [
      "Everything in Dedicated",
      "Private lockable office",
      "Furniture included",
      "Unlimited meeting rooms",
      "Custom branding options",
      "Dedicated phone line",
      "Team collaboration tools",
      "Concierge service",
    ],
    cta: "Contact Sales",
    ctaLink: "/auth/register?plan=private-office",
    popular: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="bg-gray-50 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center">
          <h2 className="text-base font-semibold text-blue-600">Pricing</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Choose the perfect plan for your needs
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Flexible pricing options with no hidden fees. Cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {pricingPlans.map((plan, index) => (
            <div
              key={index}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-white p-8 shadow-sm",
                plan.popular
                  ? "border-blue-600 shadow-xl ring-2 ring-blue-600"
                  : "border-gray-200",
              )}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-1 text-sm font-semibold text-white">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900">
                  {plan.name}
                </h3>
                <p className="mt-2 text-sm text-gray-600">{plan.description}</p>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-gray-900">
                    ₦{plan.price.toLocaleString()}
                  </span>
                  <span className="text-gray-600">/{plan.period}</span>
                </div>
              </div>

              {/* Features */}
              <ul className="mb-8 flex-1 space-y-4">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <Check className="h-5 w-5 flex-shrink-0 text-green-600" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Link
                href={plan.ctaLink}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-center font-medium transition-all",
                  plan.popular
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-900 text-white hover:bg-gray-800",
                )}
              >
                {plan.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          {/* <p className="text-gray-600">
            All plans include 14-day free trial. No credit card required.
          </p> */}
        </div>
      </div>
    </section>
  );
}
