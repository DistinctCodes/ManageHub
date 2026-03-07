import React, { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  className?: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon: Icon,
  className = "",
}) => {
  return (
    <div
      className={` bg-white relative w-full flex-shrink-0 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transform transition-all duration-300 p-5 ${className}`}
    >
      <div className="absolute top-4 left-4 w-12 h-12 bg-gradient-to-br from-[#b4ebe6] to-[#0D9488] rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
        <Icon size={22} className="text-[#2563EB]" />
      </div>

      <div className="ml-0 pt-16">
        <h3 className="text-base font-bold text-gray-900 mb-2 leading-tight">
          {title}
        </h3>
        <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
          {description}
        </p>
      </div>
    </div>
  );
};

export default FeatureCard;
