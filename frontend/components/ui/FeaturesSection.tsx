import FeatureCard from '@/components/ui/FeatureCard';
import { Users, Shield, BarChart3, Smartphone, Zap, Globe } from 'lucide-react';

const FeaturesSection = () => {
  return (
    <section className="w-full py-12 px-4 bg-[#f8fafc]">
      {/* Feature title and subtitle */}
      <div className="max-w-4xl mx-auto text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          Powerful Features Coming Your Way
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Experience the next generation of workspace management with cutting-
          <br className="sm:hidden" />
          edge technology
        </p>
      </div>

      {/* Grid of feature cards: Responsive - 1 col mobile, 2 col tablet, 3 col desktop */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <FeatureCard
          title="Smart User Management"
          description="Seamlessly manage members, staff, and visitors with role-based access control."
          icon={Users}
        />
        <FeatureCard
          title="Biometric Security"
          description="Advanced fingerprint and facial recognition for secure workspace access."
          icon={Shield}
        />
        <FeatureCard
          title="Real-time Analytics"
          description="Track workspace utilization, member engagement, and revenue insights."
          icon={BarChart3}
        />
        <FeatureCard
          title="Mobile-First Design"
          description="Native mobile apps for seamless check-ins and workspace bookings."
          icon={Smartphone}
        />
        <FeatureCard
          title="Automated Billing"
          description="Flexible subscription models with integrated payment processing."
          icon={Zap}
        />
        <FeatureCard
          title="Blockchain Integration"
          description="Transparent payments and immutable audit logs powered by Stellar."
          icon={Globe}
        />
      </div>
    </section>
  );
};

export default FeaturesSection;