"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const MOCK = [
  { id: 1, name: "The Hive", type: "Hot Desk", rate: 5, seats: 12, amenities: ["WiFi", "Coffee"] },
  { id: 2, name: "Focus Pod", type: "Private Office", rate: 20, seats: 1, amenities: ["WiFi", "AC"] },
  { id: 3, name: "Collab Room", type: "Meeting Room", rate: 15, seats: 8, amenities: ["Projector", "WiFi"] },
  { id: 4, name: "Quiet Zone", type: "Hot Desk", rate: 4, seats: 6, amenities: ["WiFi"] },
];

export default function WorkspacesPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const url = query ? `?q=${encodeURIComponent(query)}` : "?";
      router.replace(url);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const results = MOCK.filter(
    (w) => w.name.toLowerCase().includes(query.toLowerCase()) || w.type.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="relative mb-6">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search workspaces…"
          className="w-full border rounded px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        {query && <button onClick={() => setQuery("")} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">×</button>}
      </div>
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />)}</div>
      ) : results.length === 0 ? (
        <p className="text-center text-gray-500 mt-12">No workspaces match your search.</p>
      ) : (
        <div className="space-y-3">
          {results.map((w) => (
            <div key={w.id} className="border rounded p-4 flex justify-between items-start">
              <div>
                <p className="font-semibold">{w.name}</p>
                <p className="text-sm text-gray-500">{w.type} · ${w.rate}/hr · {w.seats} seats</p>
                <div className="flex gap-1 mt-1">{w.amenities.map((a) => <span key={a} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{a}</span>)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
