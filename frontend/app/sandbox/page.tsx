"use client";

import { Suspense } from "react";
import { WorkspaceFilterSidebar } from "./components/WorkspaceFilterSidebar";
import { AvailabilityCalendar } from "./components/AvailabilityCalendar";
import { NotificationBadge } from "./components/NotificationBadge";

const MOCK_AVAILABILITY = [
  { date: "2026-05-01", availableSeats: 3 },
  { date: "2026-05-02", availableSeats: 0 },
  { date: "2026-05-05", availableSeats: 2 },
  { date: "2026-05-06", availableSeats: 0 },
  { date: "2026-05-07", availableSeats: 5 },
  { date: "2026-05-12", availableSeats: 0 },
  { date: "2026-05-15", availableSeats: 1 },
];

export default function SandboxPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-10">
        <h1 className="text-2xl font-bold text-gray-900">Sandbox — Component Demos</h1>

        {/* Mock navbar with notification badge */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-700">FE-03: Notification Badge</h2>
          <div className="flex items-center gap-4 rounded-lg border bg-white px-4 py-3 shadow-sm">
            <span className="text-sm text-gray-500">Mock Navbar</span>
            <div className="ml-auto">
              <NotificationBadge wsUrl={undefined} />
            </div>
          </div>
        </section>

        {/* Workspace filter sidebar */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-700">FE-01: Workspace Filter Sidebar</h2>
          <div className="flex gap-6">
            <Suspense>
              <WorkspaceFilterSidebar />
            </Suspense>
            <div className="flex-1 rounded-lg border bg-white p-4 text-sm text-gray-400 shadow-sm">
              Workspace listing area — filters applied via URL params
            </div>
          </div>
        </section>

        {/* Availability calendar */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-700">FE-02: Availability Calendar</h2>
          <AvailabilityCalendar
            availabilityData={MOCK_AVAILABILITY}
            onDateSelect={(date) => console.log("Selected:", date)}
          />
        </section>
      </div>
    </div>
  );
}
