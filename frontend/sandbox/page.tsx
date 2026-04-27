"use client";
import { useState } from "react";
import { Users, CalendarCheck, DollarSign, Clock, Search } from "lucide-react";
import StatCard from "./components/StatCard";
import ActivityFeed, { Activity } from "./components/ActivityFeed";
import WorkspaceImageManager from "./components/WorkspaceImageManager";
import { LazyImage } from "./components/LazyImage";
import CommandPalette from "./components/CommandPalette";
import SeatMap, { Seat } from "./components/SeatMap";

const MOCK_ACTIVITIES: Activity[] = [
  { id: "1", type: "booking_created", description: "Booked The Hive for 3 hours", timestamp: new Date(Date.now() - 7200_000) },
  { id: "2", type: "checkin", description: "Checked in to Focus Pod", timestamp: new Date(Date.now() - 14400_000) },
  { id: "3", type: "invoice_paid", description: "Invoice #INV-042 paid — ₦12,000", timestamp: new Date(Date.now() - 86400_000) },
  { id: "4", type: "checkout", description: "Checked out of Collab Room", timestamp: new Date(Date.now() - 90000_000) },
  { id: "5", type: "booking_cancelled", description: "Cancelled booking for Quiet Zone", timestamp: new Date(Date.now() - 172800_000) },
  { id: "6", type: "booking_created", description: "Booked Collab Room for a team meeting", timestamp: new Date(Date.now() - 259200_000) },
  { id: "7", type: "checkin", description: "Checked in to The Hive", timestamp: new Date(Date.now() - 345600_000) },
];

const LAZY_IMAGES = [
  { src: "https://picsum.photos/seed/a/600/400", alt: "Office space A" },
  { src: "https://picsum.photos/seed/b/600/400", alt: "Office space B" },
  { src: "https://picsum.photos/seed/c/600/400", alt: "Office space C" },
  { src: "https://picsum.photos/seed/d/600/400", alt: "Office space D" },
  { src: "https://picsum.photos/seed/e/600/400", alt: "Office space E" },
  { src: "https://picsum.photos/seed/f/600/400", alt: "Office space F" },
];
const MOCK_IMAGES = [
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80",
  "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=400&q=80",
  "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&q=80",
];

// 24-seat mock: 6 occupied, rest available
const INITIAL_SEATS: Seat[] = Array.from({ length: 24 }, (_, i) => ({
  number: i + 1,
  status: [3, 7, 11, 14, 18, 22].includes(i + 1) ? "occupied" : "available",
}));

export default function SandboxPage() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [images, setImages] = useState<string[]>(MOCK_IMAGES);
  const [seats, setSeats] = useState<Seat[]>(INITIAL_SEATS);

  function handleSeatSelect(seatNumber: number) {
    setSeats((prev) =>
      prev.map((s) => (s.number === seatNumber ? { ...s, status: "selected" } : s))
    );
  }

  function handleSeatDeselect(seatNumber: number) {
    setSeats((prev) =>
      prev.map((s) => (s.number === seatNumber ? { ...s, status: "available" } : s))
    );
  }

  const selectedSeats = seats.filter((s) => s.status === "selected").map((s) => s.number);

  async function handleUpload(file: File) {
    await new Promise((r) => setTimeout(r, 800));
    const url = URL.createObjectURL(file);
    setImages((prev) => [...prev, url]);
  }

  function handleDelete(url: string) {
    setImages((prev) => prev.filter((u) => u !== url));
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-10">

      {/* ── Command Palette ── */}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      {/* ── Command Palette Demo trigger ── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Command Palette</h2>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-1">
              Press <kbd className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-mono text-gray-700">Ctrl</kbd> +{" "}
              <kbd className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-mono text-gray-700">K</kbd>{" "}
              from anywhere to open the command palette.
            </p>
            <p className="text-xs text-gray-400">Supports fuzzy search, arrow-key navigation and Enter to navigate.</p>
          </div>
          <button
            id="open-command-palette"
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-600 shadow-sm hover:bg-gray-100 transition-colors"
          >
            <Search className="w-4 h-4" />
            Open palette
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Dashboard Stats</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Members" value={1284} icon={<Users className="w-5 h-5" />} iconBg="bg-blue-100 text-blue-600" trend={{ direction: "up", percent: 12 }} />
          <StatCard label="Bookings Today" value={47} icon={<CalendarCheck className="w-5 h-5" />} iconBg="bg-green-100 text-green-600" trend={{ direction: "up", percent: 5 }} />
          <StatCard label="Revenue" value={284500} unit="₦" icon={<DollarSign className="w-5 h-5" />} iconBg="bg-purple-100 text-purple-600" trend={{ direction: "down", percent: 3 }} />
          <StatCard label="Avg. Hours/Day" value={6} icon={<Clock className="w-5 h-5" />} iconBg="bg-orange-100 text-orange-600" />
        </div>
      </section>

  <section className="p-8">
      <h1 className="text-2xl font-semibold mb-6">LazyImage Demo</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {LAZY_IMAGES.map((img) => (
          <LazyImage key={img.src} src={img.src} alt={img.alt} width={600} height={400} />
        ))}
      </div>
    </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h2>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <ActivityFeed activities={MOCK_ACTIVITIES} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Workspace Images</h2>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <WorkspaceImageManager images={images} onUpload={handleUpload} onDelete={handleDelete} />
        </div>
      </section>

      {/* ── Seat Map Demo ── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Seat Map</h2>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <SeatMap
            seats={seats}
            columns={6}
            label="The Hive — Floor 2"
            onSeatSelect={handleSeatSelect}
            onSeatDeselect={handleSeatDeselect}
          />
          {selectedSeats.length > 0 && (
            <div className="mt-5 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
              <strong>Selected seats:</strong>{" "}
              {selectedSeats.join(", ")} —{" "}
              <button
                onClick={() =>
                  setSeats((prev) =>
                    prev.map((s) =>
                      s.status === "selected" ? { ...s, status: "available" } : s
                    )
                  )
                }
                className="underline hover:no-underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
