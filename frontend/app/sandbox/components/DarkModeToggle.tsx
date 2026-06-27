"use client";

import { useEffect, useState } from "react";

export function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false);

  // Respect system preference on first load, then persist via localStorage
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = stored ? stored === "dark" : prefersDark;
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      style={{ backgroundColor: isDark ? "#3b82f6" : "#d1d5db" }}
    >
      <span
        className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-300"
        style={{ transform: isDark ? "translateX(1.4rem)" : "translateX(0.2rem)" }}
      />
      <span className="sr-only">{isDark ? "Dark" : "Light"} mode</span>
    </button>
  );
}
