"use client";

import { useMemo, useState } from "react";

interface Workspace {
  id: string;
  name: string;
  type: string;
  hourlyRate: number;
  totalSeats: number;
  amenities: string[];
  rating: number;
  availability: string;
}

const MOCK_WORKSPACES: Workspace[] = [
  {
    id: "w-1",
    name: "The Hive",
    type: "Hot Desk",
    hourlyRate: 8,
    totalSeats: 40,
    amenities: ["WiFi", "Coffee", "Locker"],
    rating: 4.5,
    availability: "Available",
  },
  {
    id: "w-2",
    name: "Focus Pod",
    type: "Private Office",
    hourlyRate: 14,
    totalSeats: 4,
    amenities: ["WiFi", "AC", "Monitor"],
    rating: 4.8,
    availability: "Limited",
  },
  {
    id: "w-3",
    name: "Collab Room",
    type: "Meeting Room",
    hourlyRate: 12,
    totalSeats: 12,
    amenities: ["Projector", "Whiteboard", "WiFi"],
    rating: 4.4,
    availability: "Available",
  },
  {
    id: "w-4",
    name: "Quiet Zone",
    type: "Silent Area",
    hourlyRate: 6,
    totalSeats: 18,
    amenities: ["WiFi", "Noise Control", "Task Lights"],
    rating: 4.2,
    availability: "Filling Fast",
  },
  {
    id: "w-5",
    name: "Executive Suite",
    type: "Private Suite",
    hourlyRate: 18,
    totalSeats: 6,
    amenities: ["AC", "Video Call Setup", "Premium Coffee"],
    rating: 4.9,
    availability: "Limited",
  },
];

export default function WorkspaceComparePage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const selectedWorkspaces = useMemo(() => {
    return selectedIds
      .map((id) => MOCK_WORKSPACES.find((workspace) => workspace.id === id))
      .filter(Boolean) as Workspace[];
  }, [selectedIds]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_WORKSPACES.filter((workspace) => {
      const alreadySelected = selectedIds.includes(workspace.id);
      const matches = workspace.name.toLowerCase().includes(q) || workspace.type.toLowerCase().includes(q);
      return !alreadySelected && matches;
    });
  }, [query, selectedIds]);

  const lowestPrice = selectedWorkspaces.length
    ? Math.min(...selectedWorkspaces.map((workspace) => workspace.hourlyRate))
    : null;

  const addWorkspace = (id: string) => {
    if (selectedIds.length >= 3 || selectedIds.includes(id)) return;
    setSelectedIds((prev) => [...prev, id]);
    setQuery("");
  };

  const removeWorkspace = (id: string) => {
    setSelectedIds((prev) => prev.filter((workspaceId) => workspaceId !== id));
  };

  const hasComparableSet = selectedWorkspaces.length >= 2;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <section>
        <h1 className="text-2xl font-bold text-gray-900">Compare Workspaces</h1>
        <p className="mt-1 text-sm text-gray-600">Select up to 3 workspaces to compare side by side.</p>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <label className="mb-2 block text-sm font-medium text-gray-800">Add workspace to compare</label>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={selectedIds.length >= 3 ? "Maximum of 3 selected" : "Search by name or type..."}
          disabled={selectedIds.length >= 3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 disabled:bg-gray-100"
        />

        {query && selectedIds.length < 3 && (
          <div className="mt-2 max-h-48 overflow-auto rounded-lg border border-gray-200">
            {suggestions.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-500">No matching workspaces.</p>
            ) : (
              suggestions.map((workspace) => (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => addWorkspace(workspace.id)}
                  className="flex w-full items-center justify-between border-b border-gray-100 px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <span>
                    <span className="block font-medium text-gray-900">{workspace.name}</span>
                    <span className="block text-xs text-gray-500">{workspace.type} - ${workspace.hourlyRate}/hr</span>
                  </span>
                  <span className="text-xs text-gray-400">Add</span>
                </button>
              ))
            )}
          </div>
        )}
      </section>

      {!hasComparableSet ? (
        <section className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <h2 className="text-lg font-semibold text-gray-900">Choose at least 2 workspaces</h2>
          <p className="mt-2 text-sm text-gray-600">Select two or three workspaces above to see a side-by-side comparison table.</p>
        </section>
      ) : (
        <section className="overflow-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[700px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b border-r border-gray-200 bg-gray-50 px-3 py-3 text-left font-semibold text-gray-700">
                  Attribute
                </th>
                {selectedWorkspaces.map((workspace) => (
                  <th key={workspace.id} className="border-b border-gray-200 px-3 py-3 text-left align-top">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{workspace.name}</p>
                        <p className="text-xs text-gray-500">{workspace.type}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeWorkspace(workspace.id)}
                        className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
                      >
                        Remove
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              <tr>
                <td className="border-r border-t border-gray-200 bg-gray-50 px-3 py-3 font-medium text-gray-700">Name</td>
                {selectedWorkspaces.map((workspace) => (
                  <td key={`${workspace.id}-name`} className="border-t border-gray-200 px-3 py-3 text-gray-900">{workspace.name}</td>
                ))}
              </tr>

              <tr>
                <td className="border-r border-t border-gray-200 bg-gray-50 px-3 py-3 font-medium text-gray-700">Type</td>
                {selectedWorkspaces.map((workspace) => (
                  <td key={`${workspace.id}-type`} className="border-t border-gray-200 px-3 py-3 text-gray-900">{workspace.type}</td>
                ))}
              </tr>

              <tr>
                <td className="border-r border-t border-gray-200 bg-gray-50 px-3 py-3 font-medium text-gray-700">Hourly Rate</td>
                {selectedWorkspaces.map((workspace) => {
                  const isLowest = lowestPrice !== null && workspace.hourlyRate === lowestPrice;
                  return (
                    <td
                      key={`${workspace.id}-price`}
                      className={`border-t border-gray-200 px-3 py-3 font-medium ${isLowest ? "bg-green-50 text-green-700" : "text-gray-900"}`}
                    >
                      ${workspace.hourlyRate}/hr
                    </td>
                  );
                })}
              </tr>

              <tr>
                <td className="border-r border-t border-gray-200 bg-gray-50 px-3 py-3 font-medium text-gray-700">Total Seats</td>
                {selectedWorkspaces.map((workspace) => (
                  <td key={`${workspace.id}-seats`} className="border-t border-gray-200 px-3 py-3 text-gray-900">{workspace.totalSeats}</td>
                ))}
              </tr>

              <tr>
                <td className="border-r border-t border-gray-200 bg-gray-50 px-3 py-3 font-medium text-gray-700">Amenities</td>
                {selectedWorkspaces.map((workspace) => (
                  <td key={`${workspace.id}-amenities`} className="border-t border-gray-200 px-3 py-3 text-gray-900">
                    {workspace.amenities.join(", ")}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="border-r border-t border-gray-200 bg-gray-50 px-3 py-3 font-medium text-gray-700">Rating</td>
                {selectedWorkspaces.map((workspace) => (
                  <td key={`${workspace.id}-rating`} className="border-t border-gray-200 px-3 py-3 text-gray-900">{workspace.rating.toFixed(1)} / 5</td>
                ))}
              </tr>

              <tr>
                <td className="border-r border-t border-gray-200 bg-gray-50 px-3 py-3 font-medium text-gray-700">Availability</td>
                {selectedWorkspaces.map((workspace) => (
                  <td key={`${workspace.id}-availability`} className="border-t border-gray-200 px-3 py-3 text-gray-900">{workspace.availability}</td>
                ))}
              </tr>

              <tr>
                <td className="border-r border-t border-gray-200 bg-gray-50 px-3 py-3 font-medium text-gray-700">Action</td>
                {selectedWorkspaces.map((workspace) => (
                  <td key={`${workspace.id}-action`} className="border-t border-gray-200 px-3 py-3">
                    <button
                      type="button"
                      className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-gray-700"
                    >
                      Book {workspace.name}
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
