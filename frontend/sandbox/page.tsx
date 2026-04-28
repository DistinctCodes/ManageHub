"use client";
import { useState } from "react";
import { Users, CalendarCheck, DollarSign, Clock, Search } from "lucide-react";
import StatCard from "./components/StatCard";
import ActivityFeed, { Activity } from "./components/ActivityFeed";
import WorkspaceImageManager from "./components/WorkspaceImageManager";
import { LazyImage } from "./components/LazyImage";
import ToastProvider from "./components/ToastProvider";
import "./components/useToast";
import AmenitiesList from "./components/AmenitiesList";
import StatCardSkeleton from "./components/skeletons/StatCardSkeleton";
import ActivityFeedSkeleton from "./components/skeletons/ActivityFeedSkeleton";
import TableRowSkeleton from "./components/skeletons/TableRowSkeleton";
import FileUpload from "./components/FileUpload";
import Link from "next/link";
import { ConfirmDialogProvider, useConfirmDialog } from "./hooks/useConfirmDialog";

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

import { ConfirmDialogProvider, useConfirmDialog } from "./hooks/useConfirmDialog";

function ConfirmDialogDemo() {
  const { confirm } = useConfirmDialog();

  async function handleDanger() {
    const confirmed = await confirm({
      title: "Delete Account",
      description: "This will permanently delete your account and all associated data. This action cannot be undone.",
      confirmLabel: "Delete Account",
      cancelLabel: "Keep Account",
      variant: "danger",
      onConfirm: async () => {
        // Simulate API call
        await new Promise((r) => setTimeout(r, 1500));
        console.log("Account deleted");
      },
    });
    console.log("Danger dialog result:", confirmed);
  }

  async function handleWarning() {
    const confirmed = await confirm({
      title: "Suspend User",
      description: "This user will be temporarily suspended. They won't be able to access the platform until reinstated.",
      confirmLabel: "Suspend User",
      cancelLabel: "Keep Active",
      variant: "warning",
      onConfirm: async () => {
        await new Promise((r) => setTimeout(r, 1500));
        console.log("User suspended");
      },
    });
    console.log("Warning dialog result:", confirmed);
  }

  async function handleInfo() {
    const confirmed = await confirm({
      title: "Cancel Booking",
      description: "Are you sure you want to cancel this booking? You may be subject to a cancellation fee.",
      confirmLabel: "Cancel Booking",
      cancelLabel: "Keep Booking",
      variant: "info",
      onConfirm: async () => {
        await new Promise((r) => setTimeout(r, 1500));
        console.log("Booking cancelled");
      },
    });
    console.log("Info dialog result:", confirmed);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={handleDanger}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        Danger Dialog
      </button>
      <button
        onClick={handleWarning}
        className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
      >
        Warning Dialog
      </button>
      <button
        onClick={handleInfo}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Info Dialog
       </button>
      </div>
    );
  }

export default function SandboxPage() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [images, setImages] = useState<string[]>(MOCK_IMAGES);
  const { toast } = useToast();

  async function handleUpload(file: File) {
    await new Promise((r) => setTimeout(r, 800));
    const url = URL.createObjectURL(file);
    setImages((prev) => [...prev, url]);
  }

  function handleDelete(url: string) {
    setImages((prev) => prev.filter((u) => u !== url));
  }

   return (
     <ConfirmDialogProvider>
       <div className="max-w-5xl mx-auto p-6 space-y-10">
         <ToastProvider />

         <section>
           <h1 className="text-3xl font-bold text-gray-900 mb-2">Sandbox Demo</h1>
           <p className="text-gray-600">Interactive component showcase for ManageHub</p>
         </section>

         {/* FE-21: Generic File Upload Component */}
         <section>
           <h2 className="text-lg font-semibold text-gray-800 mb-4">Generic File Upload</h2>
           <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
             <FileUpload
               accept="image/*,application/pdf"
               maxSize={10 * 1024 * 1024}
               onUploadComplete={(urls) => console.log("Uploads complete:", urls)}
             />
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

      {/* FE-17: Skeleton Loading Components */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Skeleton Loading States</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-3">Stat Card Skeletons</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-3">Activity Feed Skeleton</h3>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <ActivityFeedSkeleton />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-3">Table Row Skeleton (5 columns, 5 rows)</h3>
            <TableRowSkeleton columns={5} rows={5} />
          </div>
        </div>
      </section>

      {/* FE-18: Toast Notification Demo */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Toast Notifications</h2>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => toast.success("Operation completed successfully!")}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Show Success Toast
            </button>
            <button
              onClick={() => toast.error("Something went wrong. Please try again.")}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Show Error Toast
            </button>
            <button
              onClick={() => toast.info("Here's some useful information for you.")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Show Info Toast
            </button>
          </div>
        </div>
      </section>

      {/* FE-19: Amenities List Demo */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Workspace Amenities</h2>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <AmenitiesList
            amenities={[
              "WiFi",
              "Parking",
              "Coffee",
              "Printer",
              "Standing Desk",
              "AC",
              "Locker",
              "Meeting Room",
              "Whiteboard",
              "24/7 Access",
              "Phone Booth",
            ]}
          />
        </div>
      </section>

       {/* FE-20: Booking Form Link */}
       <section>
         <h2 className="text-lg font-semibold text-gray-800 mb-4">Booking Form with Zod Validation</h2>
         <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
           <p className="text-gray-600 mb-4">
             Try the new booking form with client-side validation using Zod and React Hook Form.
           </p>
           <Link
             href="/sandbox/bookings/new"
             className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
           >
             Open Booking Form
           </Link>
         </div>
       </section>

       {/* FE-22: Confirmation Dialog */}
       <section>
         <h2 className="text-lg font-semibold text-gray-800 mb-4">Confirmation Dialogs</h2>
         <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
           <p className="text-gray-600 mb-4">
             Test all three variants. Each dialog supports keyboard navigation (Escape to cancel), focus trapping, and async confirm handlers.
           </p>
           <ConfirmDialogDemo />
         </div>
        </section>
      </div>
    </ConfirmDialogProvider>
  );
}
