import type { Metadata } from "next";
import ContactUsClient from "./ContactClient";

export const metadata: Metadata = {
  title: "Contact Us | ManageHub",
  description:
    "Get in touch with the ManageHub team. Send us a message about our workspace management platform and we'll respond within 24-48 hours.",
  openGraph: {
    title: "Contact Us | ManageHub",
    description:
      "Get in touch with the ManageHub team. Send us a message about our workspace management platform.",
    type: "website",
  },
};

export default function ContactPage() {
  return <ContactUsClient />;
}
