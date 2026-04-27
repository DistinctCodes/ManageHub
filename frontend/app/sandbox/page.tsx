"use client";

import { useState, Suspense } from "react";
import { WorkspaceFilterSidebar } from "./components/WorkspaceFilterSidebar";
import { AvailabilityCalendar } from "./components/AvailabilityCalendar";
import { NotificationBadge } from "./components/NotificationBadge";
import { BookingWizardDemo } from "./components/BookingWizardDemo";
import { DataTable, type Column } from "./components/DataTable";
import { CommandPaletteDemo } from "./components/CommandPalette";
import { SeatMapDemo } from "./components/SeatMap";

// ---- Mock member data (FE-37 demo) ----

interface Member extends Record<string, unknown> {
  id: number;
  name: string;
  email: string;
  role: string;
  plan: string;
  status: string;
  joined: string;
  bookings: number;
}

const MOCK_MEMBERS: Member[] = [
  { id: 1, name: "Amara Osei",       email: "amara@example.com",   role: "Admin",  plan: "Monthly",   status: "Active",    joined: "2025-01-12", bookings: 24 },
  { id: 2, name: "Chidi Nwosu",      email: "chidi@example.com",   role: "Member", plan: "Daily",     status: "Active",    joined: "2025-03-05", bookings: 7  },
  { id: 3, name: "Fatima Al-Rashid", email: "fatima@example.com",  role: "Member", plan: "Weekly",    status: "Suspended", joined: "2024-11-20", bookings: 3  },
  { id: 4, name: "Kofi Mensah",      email: "kofi@example.com",    role: "Member", plan: "Monthly",   status: "Active",    joined: "2025-02-28", bookings: 18 },
  { id: 5, name: "Ngozi Adeyemi",    email: "ngozi@example.com",   role: "Member", plan: "Hourly",    status: "Active",    joined: "2025-04-01", bookings: 2  },
  { id: 6, name: "Seun Balogun",     email: "seun@example.com",    role: "Member", plan: "Quarterly", status: "Inactive",  joined: "2024-09-14", bookings: 31 },
  { id: 7, name: "Yetunde Fashola",  email: "yetunde@example.com", role: "Admin",  plan: "Monthly",   status: "Active",    joined: "2024-07-03", bookings: 56 },
  { id: 8, name: "Emeka Eze",        email: "emeka@example.com",   role: "Member", plan: "Daily",     status: "Active",    joined: "2025-05-10", bookings: 1  },
];

const STATUS_STYLES: Record<string, string> = {
  Active:    "bg-green-100 text-green-700",
  Suspended: "bg-red-100 text-red-700",
  Inactive:  "bg-gray-100 text-gray-500",
};

const MEMBER_COLUMNS: Column<Member>[] = [
  { key: "name",     label: "Name",     sortable: true },
  { key: "email",    label: "Email",    sortable: true },
  { key: "role",     label: "Role",     sortable: true },
  { key: "plan",     label: "Plan",     sortable: true },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (val) => (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[String(val)] ?? "bg-gray-100 text-gray-600"}`}>
        {String(val)}
      </span>
    ),
  },
  { key: "joined",   label: "Joined",   sortable: true },
  { key: "bookings", label: "Bookings", sortable: true },
];

const MOCK_AVAILABILITY = [
  { date: "2026-05-01", availableSeats: 3 },
  { date: "2026-05-02", availableSeats: 0 },
  { date: "2026-05-05", availableSeats: 2 },
  { date: "2026-05-06", availableSeats: 0 },
  { date: "2026-05-07", availableSeats: 5 },
  { date: "2026-05-12", availableSeats: 0 },
  { date: "2026-05-15", availableSeats: 1 },
];

// ---- Tabs ----

const TABS = [
  { id: "fe-36",      label: "FE-36",    title: "Booking Wizard" },
  { id: "components", label: "FE-01–35", title: "General" },
  { id: "fe-37",      label: "FE-37",    title: "Data Table" },
  { id: "fe-38",      label: "FE-38",    title: "Command Palette" },
  { id: "fe-39",      label: "FE-39",    title: "Seat Map" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ---- Page ----

export default function SandboxPage() {
  const [activeTab, setActiveTab] = useState<TabId>("fe-36");
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Sandbox — Component Demos</h1>

        {/* Tab bar */}
        <div className="flex gap-1 rounded-xl bg-white border border-gray-100 shadow-sm p-1 mb-6 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                activeTab === tab.id
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50",
              ].join(" ")}
            >
              <span className={[
                "text-xs font-mono px-1.5 py-0.5 rounded",
                activeTab === tab.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-400",
              ].join(" ")}>
                {tab.label}
              </span>
              {tab.title}
            </button>
          ))}
        </div>

        {/* Panel: Booking Wizard */}
        {activeTab === "fe-36" && <BookingWizardDemo />}

        {/* Panel: UI Components */}
        {activeTab === "components" && (
          <div className="space-y-10">
            <section>
              <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">FE-03 · Notification Badge</h2>
              <div className="flex items-center gap-4 rounded-lg border bg-white px-4 py-3 shadow-sm">
                <span className="text-sm text-gray-500">Mock Navbar</span>
                <div className="ml-auto">
                  <NotificationBadge wsUrl={undefined} />
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">FE-01 · Filter Sidebar</h2>
              <div className="flex gap-6">
                <Suspense>
                  <WorkspaceFilterSidebar />
                </Suspense>
                <div className="flex-1 rounded-lg border bg-white p-4 text-sm text-gray-400 shadow-sm">
                  Workspace listing area — filters applied via URL params
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">FE-02 · Availability Calendar</h2>
              <AvailabilityCalendar
                availabilityData={MOCK_AVAILABILITY}
                onDateSelect={(date) => console.log("Selected:", date)}
              />
            </section>
          </div>
        )}

        {/* Panel: Data Table */}
        {activeTab === "fe-37" && (
          <div>
            <p className="mb-4 text-sm text-gray-400">
              Click column headers to sort · toggle visibility via Columns · check rows to select
            </p>
            <DataTable
              columns={MEMBER_COLUMNS}
              data={MOCK_MEMBERS}
              onSelectionChange={setSelectedMembers}
            />
            {selectedMembers.length > 0 && (
              <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                Selected: {selectedMembers.map((m) => m.name).join(", ")}
              </div>
            )}
          </div>
        )}
        {/* Panel: Command Palette */}
        {activeTab === "fe-38" && <CommandPaletteDemo />}

        {/* Panel: Seat Map */}
        {activeTab === "fe-39" && <SeatMapDemo />}
      </div>
    </div>
  );
}
