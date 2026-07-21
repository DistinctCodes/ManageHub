"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const WORKSPACE_TYPES = ["Private Office", "Hot Desk", "Meeting Room", "Event Space"];
const AMENITIES = ["WiFi", "Parking", "Coffee", "Printer", "AC", "Standing Desk"];

export function WorkspaceFilterSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (selectedTypes.length) params.set("types", selectedTypes.join(","));
    else params.delete("types");
    if (minPrice) params.set("minPrice", minPrice);
    else params.delete("minPrice");
    if (maxPrice) params.set("maxPrice", maxPrice);
    else params.delete("maxPrice");
    if (selectedAmenities.length) params.set("amenities", selectedAmenities.join(","));
    else params.delete("amenities");
    router.push(`?${params.toString()}`);
  }, [router, searchParams, selectedTypes, minPrice, maxPrice, selectedAmenities]);

  const clearFilters = () => {
    setSelectedTypes([]);
    setMinPrice("");
    setMaxPrice("");
    setSelectedAmenities([]);
    router.push("?");
  };

  const toggleItem = (item: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  return (
    <aside className="w-full md:w-64 shrink-0 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">Filters</h2>
        <button onClick={clearFilters} className="text-xs text-blue-600 hover:underline">
          Clear all
        </button>
      </div>

      {/* Workspace Type */}
      <div className="mb-4">
        <p className="mb-2 text-sm font-medium text-gray-700">Workspace Type</p>
        {WORKSPACE_TYPES.map((type) => (
          <label key={type} className="flex cursor-pointer items-center gap-2 py-1 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={selectedTypes.includes(type)}
              onChange={() => toggleItem(type, selectedTypes, setSelectedTypes)}
              className="accent-blue-600"
            />
            {type}
          </label>
        ))}
      </div>

      {/* Price Range */}
      <div className="mb-4">
        <p className="mb-2 text-sm font-medium text-gray-700">Price Range</p>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </div>
      </div>

      {/* Amenities */}
      <div className="mb-4">
        <p className="mb-2 text-sm font-medium text-gray-700">Amenities</p>
        {AMENITIES.map((amenity) => (
          <label key={amenity} className="flex cursor-pointer items-center gap-2 py-1 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={selectedAmenities.includes(amenity)}
              onChange={() => toggleItem(amenity, selectedAmenities, setSelectedAmenities)}
              className="accent-blue-600"
            />
            {amenity}
          </label>
        ))}
      </div>

      <button
        onClick={applyFilters}
        className="w-full rounded bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Apply Filters
      </button>
    </aside>
  );
}
