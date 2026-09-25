"use client";

import dynamic from "next/dynamic";

// AdminCreditsManagement is a large, admin-only surface (issue #1816).
// It is intentionally NOT statically imported anywhere: it is split into
// its own chunk and only fetched when an authenticated admin visits
// /admin/credits, so regular (non-admin) users never download it.
const AdminCreditsManagement = dynamic(
  () => import("@/lib/AdminCreditsManagement"),
  {
    ssr: false,
    loading: () => (
      <p className="animate-pulse text-sm text-gray-500 dark:text-gray-400">
        Loading credits & payments management…
      </p>
    ),
  },
);

export default function AdminCreditsPage() {
  return (
    <div className="space-y-6">
      <AdminCreditsManagement />
    </div>
  );
}