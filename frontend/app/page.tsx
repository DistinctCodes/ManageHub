import Newsletter from "./components/newa-letter";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Home",
  description: "Welcome to ManageHub - Your smart workspace management solution",
  keywords: ["workspace", "management", "productivity", "collaboration", "hub"]
});

export default function Home() {
  return (
    <main>
      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center">
        <h1 className="text-4xl font-bold">Hero Section</h1>
      </section>

      {/* Newsletter Section */}
      <Newsletter />
    </main>
  );
}
