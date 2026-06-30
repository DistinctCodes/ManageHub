"use client";

import { Search } from "lucide-react";
import DashboardSidebar from "./DashboardSidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const openSearch = () => {
    // This is a bit of a hack, but it's the easiest way to open the search palette
    // from outside the component.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
  };

  return (
    <div className="min-h-screen bg-[#f8f8f6]">
      <DashboardSidebar />
      <main className="lg:pl-64">
        <div className="p-4 lg:hidden flex justify-end">
          <button
            onClick={openSearch}
            className="p-2 bg-white rounded-lg shadow-md border border-gray-200"
            aria-label="Open search"
          >
            <Search className="w-5 h-5 text-gray-700" />
          </button>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 lg:pt-8">
          <div className="hidden lg:flex justify-end mb-4">
            <button
              onClick={openSearch}
              className="p-2 bg-white rounded-lg shadow-md border border-gray-200"
              aria-label="Open search"
            >
              <Search className="w-5 h-5 text-gray-700" />
            </button>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}