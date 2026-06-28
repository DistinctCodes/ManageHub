"use client";

/**
 * LocationSwitcher
 *
 * Dropdown that lets the user pick an active location.
 * Hidden when only one location exists (single-hub operators see no change).
 *
 * Used in:
 *   frontend/components/ui/Navbar.tsx
 *   frontend/components/dashboard/DashboardSidebar.tsx  (optional)
 *
 * Location: frontend/components/ui/LocationSwitcher.tsx
 */

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useAuthStore } from "@/lib/store/authStore";

// ── Types ──────────────────────────────────────────────────────────────────

interface Location {
  id: string;
  name: string;
  isActive: boolean;
}

// ── Data fetching ──────────────────────────────────────────────────────────

async function fetchLocations(): Promise<Location[]> {
  const { data } = await axios.get<Location[]>("/api/locations");
  return data.filter((l) => l.isActive);
}

function useLocations() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: fetchLocations,
    staleTime: 10 * 60 * 1000,
  });
}

// ── Component ──────────────────────────────────────────────────────────────

export function LocationSwitcher() {
  const { data: locations, isLoading } = useLocations();
  const { selectedLocationId, setSelectedLocationId, user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === "admin";

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Hide if only one location — single-hub operators see no UI change
  if (!isLoading && (!locations || locations.length <= 1)) return null;

  const currentLocation = locations?.find((l) => l.id === selectedLocationId);
  const label = selectedLocationId
    ? (currentLocation?.name ?? "Unknown")
    : "All Locations";

  function select(id: string | null) {
    setSelectedLocationId(id);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
      >
        <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
        <span className="max-w-[140px] truncate">{label}</span>
        <svg
          className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-56 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
          {/* "All Locations" — admin only */}
          {isAdmin && (
            <button
              onClick={() => select(null)}
              className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 ${
                !selectedLocationId ? "font-semibold text-blue-600" : "text-gray-700"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
              All Locations
            </button>
          )}

          {isLoading && (
            <div className="px-4 py-2 text-sm text-gray-400">Loading…</div>
          )}

          {locations?.map((loc) => (
            <button
              key={loc.id}
              onClick={() => select(loc.id)}
              className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 ${
                selectedLocationId === loc.id
                  ? "font-semibold text-blue-600"
                  : "text-gray-700"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  selectedLocationId === loc.id ? "bg-blue-500" : "bg-gray-300"
                }`}
              />
              <span className="truncate">{loc.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}