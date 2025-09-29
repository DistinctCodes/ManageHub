import Newsletter from "./components/newa-letter";
import Footer from "./components/ui/Footer";

export default function Home() {
  return (
    <main>
      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center">
        <h1 className="text-4xl font-bold">Hero Section</h1>
      </section>

      {/* Newsletter Section */}
      <Newsletter />

      {/* Footer Section */}
      <Footer />
    </main>
  );
}