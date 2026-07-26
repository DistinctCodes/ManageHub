import type { Metadata } from "next";
import PublicPricingPage from "./PricingClient";

export const metadata: Metadata = {
  title: "Pricing | ManageHub",
  description:
    "Explore flexible membership plans for modern workspaces. Choose hourly, daily, weekly, or monthly plans that fit your workflow.",
  openGraph: {
    title: "Pricing | ManageHub",
    description:
      "Explore flexible membership plans for modern workspaces. Choose hourly, daily, weekly, or monthly plans that fit your workflow.",
    type: "website",
  },
};

export default function PricingPage() {
  return <PublicPricingPage />;
}
