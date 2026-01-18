// frontend/types/homepage.types.ts
export interface Feature {
  icon: string;
  title: string;
  description: string;
}

export interface PricingPlan {
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  cta: string;
  ctaLink: string;
}

export interface Testimonial {
  name: string;
  role: string;
  company: string;
  image?: string;
  content: string;
  rating: number;
}

export interface Stat {
  value: string;
  label: string;
}
