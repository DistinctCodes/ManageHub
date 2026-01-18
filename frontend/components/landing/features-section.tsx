// frontend/src/components/landing/features-section.tsx
import {
  Fingerprint,
  Wallet,
  BarChart3,
  Shield,
  Zap,
  Users,
  Clock,
  CreditCard,
  Globe,
} from "lucide-react";

const features = [
  {
    icon: Fingerprint,
    title: "Biometric Check-In",
    description:
      "Secure and contactless access with fingerprint and facial recognition technology.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Wallet,
    title: "Blockchain Wallet",
    description:
      "Integrated Stellar wallet for secure, fast, and low-cost cryptocurrency transactions.",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description:
      "Track workspace utilization, member activity, and revenue metrics in real-time.",
    color: "from-orange-500 to-red-500",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "Bank-level encryption, 2FA authentication, and comprehensive access controls.",
    color: "from-green-500 to-teal-500",
  },
  {
    icon: Zap,
    title: "Instant Payments",
    description:
      "Seamless payment processing with Paystack integration and multiple payment plans.",
    color: "from-yellow-500 to-orange-500",
  },
  {
    icon: Users,
    title: "Member Management",
    description:
      "Comprehensive admin dashboard to manage members, bookings, and subscriptions.",
    color: "from-indigo-500 to-purple-500",
  },
  {
    icon: Clock,
    title: "Attendance Tracking",
    description:
      "Automated check-in/check-out system with detailed attendance reports.",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: CreditCard,
    title: "Flexible Pricing",
    description:
      "Multiple membership tiers with daily, weekly, monthly, and annual payment options.",
    color: "from-cyan-500 to-blue-500",
  },
  {
    icon: Globe,
    title: "Multi-Location",
    description:
      "Manage multiple workspace locations from a single unified dashboard.",
    color: "from-teal-500 to-green-500",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center">
          <h2 className="text-base font-semibold text-blue-600">Features</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Everything you need to manage your workspace
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Powerful features designed to streamline operations, enhance
            security, and provide valuable insights.
          </p>
        </div>

        {/* Features Grid */}
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 transition-all hover:shadow-xl"
            >
              {/* Gradient background on hover */}
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-50 to-purple-50 opacity-0 transition-opacity group-hover:opacity-100" />

              {/* Icon */}
              <div
                className={`inline-flex rounded-xl bg-gradient-to-br ${feature.color} p-3`}
              >
                <feature.icon className="h-6 w-6 text-white" />
              </div>

              {/* Content */}
              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                {feature.title}
              </h3>
              <p className="mt-2 text-gray-600">{feature.description}</p>

              {/* Decorative element */}
              <div className="absolute -bottom-2 -right-2 h-24 w-24 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
