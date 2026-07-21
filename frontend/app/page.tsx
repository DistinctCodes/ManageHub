import { Navbar } from "@/components/ui/Navbar";
import { Hero } from "@/components/ui/Hero";
import TrustedBy from "@/components/ui/TrustedBy";
import FeaturesSection from "@/components/ui/FeaturesSection";
import HowItWorks from "@/components/ui/HowItWorks";
import Newsletter from "@/components/ui/Newsletter";
import Footer from "@/components/ui/Footer";

export const metadata = {
  title: "ManageHub - Smart Hub & Workspace Management",
  description:
    "Simplify how you manage workspaces, teams, and resources. ManageHub brings everything together in one place.",
};

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <TrustedBy />
      <FeaturesSection />
      <HowItWorks />
      <Newsletter />
      <Footer />
    </main>
  );
}
