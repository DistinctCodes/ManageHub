"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { apiClient } from "@/lib/apiClient";

export default function Newsletter() {
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await apiClient.post("/newsletter/subscribe", {
        email,
      });

      setSuccess("Thanks! Check your email to confirm your subscription.");
      setEmail("");
      console.log("Subscribed response:", res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Subscription failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative px-6 py-28 bg-gray-900 grain" id="notify">
      <div className="max-w-3xl mx-auto text-center fade-in-up">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Ready to simplify your workspace?
        </h2>
        <p className="text-gray-400 mb-10 max-w-md mx-auto">
          Join thousands of teams already managing smarter. No credit card
          required.
        </p>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto"
        >
          <input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 px-5 py-3.5 rounded-full bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-white text-gray-900 font-medium px-7 py-3.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            {loading ? "Sending..." : "Get early access"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
        {success && <p className="text-emerald-400 text-sm mt-4">{success}</p>}
      </div>
    </section>
  );
}
