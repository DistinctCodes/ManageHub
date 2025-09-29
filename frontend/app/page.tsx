import Newsletter from "./components/newa-letter";
import ThemeToggle from "../components/ui/ThemeToggle";

export default function Home() {
  return (
    <main>
      <ThemeToggle />
      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center">
        <h1 className="text-4xl font-bold">Hero Section</h1>
      </section>

      {/* Newsletter Section */}
      <Newsletter />
    </main>
  );
}
