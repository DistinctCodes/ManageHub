import FeatureCard from "@/components/ui/FeatureCard";
import { Users, Shield, BarChart3, Smartphone, Zap, Globe } from "lucide-react";

const features = [
  {
    icon: <Users className="h-6 w-6" />,
    title: "Smart User Management",
    description:
      "Seamlessly manage members, staff, and visitors with role-based access control",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Biometric Security",
    description:
      "Advanced fingerprint and facial recognition for secure workspace access",
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: "Real-time Analytics",
    description:
      "Track workspace utilization, member engagement, and revenue insights",
  },
  {
    icon: <Smartphone className="h-6 w-6" />,
    title: "Mobile-First Design",
    description:
      "Native mobile apps for seamless check-ins and workspace bookings",
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: "Automated Billing",
    description:
      "Flexible subscription models with integrated payment processing",
  },
  {
    icon: <Globe className="h-6 w-6" />,
    title: "Blockchain Integration",
    description:
      "Transparent payments and immutable audit logs powered by Stellar",
  },
];

const FeaturesSection = () => {
  return (
    <section
      id="features"
      className="relative z-10 px-4 py-30 bg-[#f8fafc] backdrop-blur-sm"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Powerful Features Coming Your Way
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Experience the next generation of workspace management with
            cutting-edge technology
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 group hover:-translate-y-1"
            >
              <div className="bg-gradient-to-br from-blue-100 to-teal-100 w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <div className="text-blue-600">{feature.icon}</div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
