import React, { useState, useEffect, useRef } from 'react';

const AMENITIES = ['WiFi', 'Parking', 'Coffee', 'Projector', 'AC', 'Standing Desk'];
interface WorkspaceFilters { search: string; minCapacity?: number; maxPriceKobo?: number; amenities: string[]; }
interface Props { onFilterChange: (f: WorkspaceFilters) => void; }

export function WorkspaceFilterPanel({ onFilterChange }: Props) {
  const [search, setSearch] = useState('');
  const [minCapacity, setMinCapacity] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onFilterChange({ search, minCapacity: minCapacity ? Number(minCapacity) : undefined, maxPriceKobo: maxPrice ? Number(maxPrice) * 100 : undefined, amenities });
    }, 300);
    return () => clearTimeout(timer.current);
  }, [search, minCapacity, maxPrice, amenities, onFilterChange]);

  const clear = () => { setSearch(''); setMinCapacity(''); setMaxPrice(''); setAmenities([]); };

  return (
    <div className="space-y-3 p-4 border rounded-lg">
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search workspaces…" className="w-full border rounded px-3 py-2 text-sm" />
      <input type="number" value={minCapacity} onChange={(e) => setMinCapacity(e.target.value)} placeholder="Min capacity" className="w-full border rounded px-3 py-2 text-sm" />
      <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max price (₦)" className="w-full border rounded px-3 py-2 text-sm" />
      <div className="grid grid-cols-2 gap-1">
        {AMENITIES.map((a) => (
          <label key={a} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={amenities.includes(a)} onChange={(e) => setAmenities(e.target.checked ? [...amenities, a] : amenities.filter((x) => x !== a))} />
            {a}
          </label>
        ))}
      </div>
      <button onClick={clear} className="text-sm text-blue-600 hover:underline">Clear all</button>
    </div>
  );
}