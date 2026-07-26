import type { Metadata } from "next";
import TermsOfServiceClient from "./TermsOfServiceClient";

export const metadata: Metadata = {
  title: "Terms of Service | ManageHub",
  description:
    "Read the ManageHub Terms of Service covering user accounts, payments, conduct rules, privacy, termination, and liability for our workspace management platform.",
  openGraph: {
    title: "Terms of Service | ManageHub",
    description:
      "Read the ManageHub Terms of Service covering user accounts, payments, conduct rules, and more.",
    type: "website",
  },
};

export default function TermsOfServicePage() {
  return <TermsOfServiceClient />;
}
