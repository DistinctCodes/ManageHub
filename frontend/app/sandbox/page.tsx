"use client";

import { useState } from "react";
import { ProfileCompleteness } from "./components/ProfileCompleteness";
import { CheckInModal } from "./components/CheckInModal";

const MOCK_ITEMS = [
  { label: "Add profile photo", completed: true },
  { label: "Verify email", completed: true },
  { label: "Complete name", completed: true },
  { label: "Add phone number", completed: false, href: "/profile/phone" },
  { label: "Make first booking", completed: false, href: "/bookings/new" },
];

export default function SandboxPage() {
  const [modal, setModal] = useState<"checkin" | "checkout" | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-2xl space-y-10">
        <h1 className="text-2xl font-bold text-gray-900">Sandbox — Component Demos</h1>

        {/* FE-05 */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-700">FE-05: Profile Completeness</h2>
          <ProfileCompleteness completeness={60} items={MOCK_ITEMS} />
        </section>

        {/* FE-07 */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-700">FE-07: Check-In Modal</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setModal("checkin")}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Open Check-In Modal
            </button>
            <button
              onClick={() => setModal("checkout")}
              className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Open Check-Out Modal
            </button>
          </div>

          {modal && (
            <CheckInModal
              type={modal}
              workspaceName="The Hub — Desk 12"
              currentTime={new Date().toLocaleString()}
              checkInTime={new Date(Date.now() - 90 * 60 * 1000).toISOString()}
              onConfirm={() => { setModal(null); }}
              onCancel={() => setModal(null)}
            />
          )}
        </section>
      </div>
    </div>
  );
}
