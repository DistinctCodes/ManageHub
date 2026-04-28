"use client";

import { useMemo, useState } from "react";
import { Award, Lock, ShieldCheck, Star, X } from "lucide-react";
import { useAuthRedirect } from "@/lib/hooks/useAuthRedirect";

type BadgeFilter = "all" | "earned" | "locked";

interface Badge {
  id: string;
  name: string;
  description: string;
  dateEarned: string | null;
  criteria: string;
  fullDescription: string;
  earned: boolean;
  icon: "award" | "shield" | "star";
}

const BADGES: Badge[] = [
  {
    id: "b1",
    name: "Early Bird",
    description: "Booked 10 check-ins before 8:00 AM.",
    dateEarned: "2026-03-18",
    criteria: "Complete 10 early check-ins.",
    fullDescription:
      "Recognizes members who make productive use of workspace hours by checking in early and consistently.",
    earned: true,
    icon: "award",
  },
  {
    id: "b2",
    name: "Reliable Member",
    description: "Completed 30 bookings with no cancellations.",
    dateEarned: "2026-04-07",
    criteria: "Finish 30 bookings with full attendance.",
    fullDescription:
      "Given to members who consistently honor reservations and maintain a reliable booking history.",
    earned: true,
    icon: "shield",
  },
  {
    id: "b3",
    name: "Community Star",
    description: "Received 15 positive workspace reviews.",
    dateEarned: null,
    criteria: "Collect 15 positive peer or host reviews.",
    fullDescription:
      "Celebrates collaborative behavior and positive contributions to the shared workspace community.",
    earned: false,
    icon: "star",
  },
  {
    id: "b4",
    name: "Power Booker",
    description: "Booked 50 sessions in a single quarter.",
    dateEarned: null,
    criteria: "Reach 50 confirmed bookings in one quarter.",
    fullDescription:
      "Highlights consistent workspace usage and planning discipline over a sustained period.",
    earned: false,
    icon: "award",
  },
];

function BadgeIcon({
  icon,
  className,
}: {
  icon: Badge["icon"];
  className?: string;
}) {
  if (icon === "shield") return <ShieldCheck className={className} />;
  if (icon === "star") return <Star className={className} />;
  return <Award className={className} />;
}

export default function BadgeGalleryPage() {
  const { isLoading, canAccess } = useAuthRedirect({
    requireAuth: true,
    redirectTo: "/login",
  });
  const [activeFilter, setActiveFilter] = useState<BadgeFilter>("all");
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const filteredBadges = useMemo(() => {
    if (activeFilter === "earned")
      return BADGES.filter((badge) => badge.earned);
    if (activeFilter === "locked")
      return BADGES.filter((badge) => !badge.earned);
    return BADGES;
  }, [activeFilter]);

  if (isLoading) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <p className="text-sm text-gray-600">Checking your session...</p>
      </main>
    );
  }

  if (!canAccess) {
    return null;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <section>
        <h1 className="text-2xl font-bold text-gray-900">
          Member Badge Gallery
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Track earned badges and view criteria for locked rewards.
        </p>
      </section>

      <section className="flex gap-2">
        {[
          { key: "all", label: "All" },
          { key: "earned", label: "Earned" },
          { key: "locked", label: "Locked" },
        ].map((tab) => {
          const isActive = activeFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveFilter(tab.key as BadgeFilter)}
              className={`rounded-lg border px-4 py-2 text-sm transition ${
                isActive
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-900"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </section>

      {activeFilter === "earned" && filteredBadges.length === 0 ? (
        <section className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            No earned badges yet
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Complete bookings and engagement milestones to unlock your first
            badge.
          </p>
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBadges.map((badge) => (
            <button
              key={badge.id}
              type="button"
              onClick={() => setSelectedBadge(badge)}
              className={`relative rounded-xl border p-4 text-left transition ${
                badge.earned
                  ? "border-gray-200 bg-white hover:border-gray-400"
                  : "border-gray-200 bg-gray-100 grayscale hover:grayscale-0"
              }`}
            >
              {!badge.earned && (
                <span className="absolute right-3 top-3 rounded-full bg-gray-800 p-1 text-white">
                  <Lock className="h-3 w-3" />
                </span>
              )}

              <BadgeIcon
                icon={badge.icon}
                className="mb-3 h-7 w-7 text-gray-900"
              />
              <h3 className="text-sm font-semibold text-gray-900">
                {badge.name}
              </h3>
              <p className="mt-1 text-xs text-gray-600">{badge.description}</p>
              <p className="mt-3 text-xs text-gray-500">
                {badge.dateEarned
                  ? `Earned on ${badge.dateEarned}`
                  : "Not earned yet"}
              </p>
            </button>
          ))}
        </section>
      )}

      {selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedBadge.name}
                </h2>
                <p className="text-xs text-gray-500">
                  {selectedBadge.earned ? "Earned" : "Locked"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBadge(null)}
                className="rounded bg-gray-100 p-1 text-gray-700 hover:bg-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-gray-700">
              {selectedBadge.fullDescription}
            </p>
            <div className="mt-4 rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Earning Criteria
              </p>
              <p className="mt-1 text-sm text-gray-700">
                {selectedBadge.criteria}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedBadge(null)}
              className="mt-4 w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
