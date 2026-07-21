"use client";

import Link from "next/link";
import { Workspace } from "@/lib/types/workspace";
import { MapPin, Users, ArrowRight } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  COWORKING: "Coworking",
  PRIVATE_OFFICE: "Private Office",
  MEETING_ROOM: "Meeting Room",
  HOT_DESK: "Hot Desk",
  DEDICATED_DESK: "Dedicated Desk",
};

const TYPE_COLORS: Record<string, string> = {
  COWORKING: "bg-blue-50 text-blue-700",
  PRIVATE_OFFICE: "bg-purple-50 text-purple-700",
  MEETING_ROOM: "bg-amber-50 text-amber-700",
  HOT_DESK: "bg-green-50 text-green-700",
  DEDICATED_DESK: "bg-rose-50 text-rose-700",
};

interface Props {
  workspace: Workspace;
}

export default function WorkspaceCard({ workspace }: Props) {
  const hourlyNaira = (workspace.hourlyRate / 100).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  });

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
      {/* Image or placeholder */}
      <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 relative">
        {workspace.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={workspace.images[0]}
            alt={workspace.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-8 h-8 text-gray-300" />
          </div>
        )}
        <span
          className={`absolute top-3 left-3 px-2 py-0.5 rounded-full text-xs font-medium ${
            TYPE_COLORS[workspace.type] ?? "bg-gray-100 text-gray-600"
          }`}
        >
          {TYPE_LABELS[workspace.type] ?? workspace.type}
        </span>
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm truncate">
          {workspace.name}
        </h3>
        {workspace.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {workspace.description}
          </p>
        )}

        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {workspace.totalSeats} seat{workspace.totalSeats !== 1 ? "s" : ""}
          </span>
          {workspace.amenities?.slice(0, 2).map((a) => (
            <span key={a} className="truncate">{a}</span>
          ))}
        </div>

        <div className="flex items-center justify-between mt-4">
          <div>
            <span className="text-base font-bold text-gray-900">
              {hourlyNaira}
            </span>
            <span className="text-xs text-gray-400 ml-1">/hr</span>
          </div>
          <Link
            href={`/workspaces/${workspace.id}`}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 transition-colors group-hover:bg-gray-700"
          >
            View
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
