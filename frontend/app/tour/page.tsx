import type { Metadata } from "next";
import TourClient from "./TourClient";

export const metadata: Metadata = {
  title: "Book a Tour | ManageHub",
  description:
    "Schedule a tour of ManageHub's modern workspace facilities. See our spaces, amenities, and meet the community before you join.",
  openGraph: {
    title: "Book a Tour | ManageHub",
    description:
      "Schedule a tour of ManageHub's modern workspace facilities. See our spaces and amenities.",
    type: "website",
  },
};

export default function TourPage() {
  return <TourClient />;
}
