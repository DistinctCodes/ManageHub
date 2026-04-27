"use client";
import { useState } from "react";
import { Users, CalendarCheck, DollarSign, Clock } from "lucide-react";
import StatCard from "./components/StatCard";
import ActivityFeed, { Activity } from "./components/ActivityFeed";
import WorkspaceImageManager from "./components/WorkspaceImageManager";
import { LazyImage } from "./components/LazyImage";

const MOCK_ACTIVITIES: Activity[] = [
  { id: "1", type: "booking_created", description: "Booked The Hive for 3 hours", timestamp: new Date(Date.now() - 7200_000) },
  { id: "2", type: "checkin", description: "Checked in to Focus Pod", timestamp: new Date(Date.now() - 14400_000) },
  { id: "3", type: "invoice_paid", description: "Invoice #INV-042 paid — ₦12,000", timestamp: new Date(Date.now() - 86400_000) },
  { id: "4", type: "checkout", description: "Checked out of Collab Room", timestamp: new Date(Date.now() - 90000_000) },
  { id: "5", type: "booking_cancelled", description: "Cancelled booking for Quiet Zone", timestamp: new Date(Date.now() - 172800_000) },
  { id: "6", type: "booking_created", description: "Booked Collab Room for a team meeting", timestamp: new Date(Date.now() - 259200_000) },
  { id: "7", type: "checkin", description: "Checked in to The Hive", timestamp: new Date(Date.now() - 345600_000) },
];

const images = [
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

export default function SandboxPage() {
  const [images, setImages] = useState<string[]>(MOCK_IMAGES);

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
        {images.map((img) => (
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
    </div>
  );
}
