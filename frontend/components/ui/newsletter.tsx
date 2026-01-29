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

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    setLoading(true)

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
    <div
      className="w-full flex justify-center px-4 pt-30 pb-10 bg-[#f8fafc]"
      id="notify"
    >
      <div className="max-w-lg w-full bg-white backdrop-blur-lg rounded-2xl shadow-lg p-8 text-center">
        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Be the First to Know
        </h2>

        {/* Subtitle */}
        <p className="text-gray-600 mb-6">
          Get exclusive early access and updates on our launch.
        </p>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row gap-3"
        >
          <input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white font-medium px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {loading ? "Submitting..." : "Notify Me"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Error */}
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        {success && <p className="text-green-600 text-sm mt-3">{success}</p>}
      </div>
    </div>
  );
}
