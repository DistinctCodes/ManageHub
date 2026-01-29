import { Navbar } from "@/components/ui/Navbar";
import Newsletter from "../components/ui/Newsletter";
import Footer from "../components/ui/Footer";
import { useMemo } from "react";
import { Hero } from "@/components/ui/Hero";
import FeaturesSection from "@/components/ui/FeaturesSection";

export default function Home() {
  const launchDate = useMemo(
    () => new Date(Date.now() + 1000 * 60 * 60 * 24 * 77 + 1000 * 60 * 10),
    [],
  );
  return (
    <main>
      <Navbar />
      <Hero launchDate={launchDate} />
      <Newsletter />
      <FeaturesSection />
      <Footer />
    </main>
  );
}
