
import { Navbar } from "@/components/ui/Navbar";
import Newsletter from "../components/newa-letter";
import Footer from "../components/ui/Footer";
import { useMemo } from "react";
import { Hero } from "@/components/ui/Hero";

export default function Home() {
  const launchDate = useMemo(() => new Date(Date.now() + 1000 * 60 * 60 * 24 * 77 + 1000 * 60 * 10), []);
  return ( 
    <main>
      <Navbar />
      {/* Hero Section */}
      <Hero launchDate={launchDate} />        {/* Newsletter Section */}
      <section className="min-h-screen flex items-center justify-center">
        / </section>
        <Newsletter />
        {/* Footer Section */}
      <Footer />
    </main>
  );
}
