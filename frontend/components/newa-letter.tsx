"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

export default function Newsletter() {
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    // For now just log it – no backend integration
    console.log("Subscribed:", email);
    setEmail("");
  };

  return (
    <div className="w-full flex justify-center px-4 py-30">
      <div className="max-w-lg w-full bg-white/20 backdrop-blur-lg rounded-2xl shadow-lg p-8 text-center">
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
            className="flex items-center justify-center gap-2 bg-blue-600 text-white font-medium px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Notify Me
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Error */}
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </div>
    </div>
  );
}
