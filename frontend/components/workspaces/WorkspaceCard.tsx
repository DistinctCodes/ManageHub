"use client";

import Link from "next/link";
import { Workspace } from "@/lib/types/workspace";

const TYPE_LABELS: Record<Workspace["type"], string> = {
  COWORKING: "Coworking",
  PRIVATE_OFFICE: "Private Office",
  MEETING_ROOM: "Meeting Room",
  HOT_DESK: "Hot Desk",
  DEDICATED_DESK: "Dedicated Desk",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

export default function WorkspaceCard({ workspace }: { workspace: Workspace }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="h-36 bg-gradient-to-br from-amber-100 via-white to-gray-100" />
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">
              {TYPE_LABELS[workspace.type]}
            </p>
            <h2 className="mt-2 text-lg font-semibold text-gray-900">
              {workspace.name}
            </h2>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            {workspace.availableSeats}/{workspace.totalSeats} seats
          </span>
        </div>

        <p className="text-sm leading-6 text-gray-600">
          {workspace.description || "A well-equipped workspace ready for your next session."}
        </p>

        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">
            {formatCurrency(workspace.hourlyRate)}
            <span className="ml-1 font-normal text-gray-500">/ hour</span>
          </p>
          <Link
            href={`/workspaces/${workspace.id}`}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            View workspace
          </Link>
        </div>
      </div>
    </article>
  );
}
