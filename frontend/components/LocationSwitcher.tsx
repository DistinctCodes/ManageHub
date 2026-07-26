'use client';

import { useState } from 'react';

interface LocationOption {
  id: string;
  name: string;
  city: string;
  capacity: number;
}

export default function LocationSwitcher() {
  const [selectedLocation, setSelectedLocation] = useState('loc_1');
  const [locations] = useState<LocationOption[]>([
    { id: 'loc_1', name: 'Downtown Hub', city: 'New York', capacity: 50 },
    { id: 'loc_2', name: 'Tech Park', city: 'San Francisco', capacity: 100 },
    { id: 'loc_3', name: 'Innovation Center', city: 'Austin', capacity: 75 },
  ]);

  const [showAdmin, setShowAdmin] = useState(false);

  return (
    <div className="p-4 bg-white border rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Workspace Location</h3>
        <button onClick={() => setShowAdmin(!showAdmin)} className="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300">
          {showAdmin ? 'View' : 'Admin'}
        </button>
      </div>

      <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} className="border p-2 w-full rounded mb-4">
        {locations.map((loc) => (
          <option key={loc.id} value={loc.id}>
            {loc.name} - {loc.city}
          </option>
        ))}
      </select>

      {showAdmin && (
        <div className="border-t pt-4 mt-4">
          <h4 className="font-semibold mb-3">All Locations</h4>
          <div className="space-y-2">
            {locations.map((loc) => (
              <div key={loc.id} className="p-3 bg-gray-50 rounded border">
                <p className="font-semibold">{loc.name}</p>
                <p className="text-sm text-gray-600">{loc.city} • Capacity: {loc.capacity}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
