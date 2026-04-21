"use client";

import { use } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useGetWorkspaceById } from "@/lib/react-query/hooks/workspaces/useGetWorkspaceById";
import {
  ArrowLeft,
  Users,
  MapPin,
  CheckCircle2,
  CalendarPlus,
} from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  COWORKING: "Coworking",
  PRIVATE_OFFICE: "Private Office",
  MEETING_ROOM: "Meeting Room",
  HOT_DESK: "Hot Desk",
  DEDICATED_DESK: "Dedicated Desk",
};

export default function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, isError } = useGetWorkspaceById(id);
  const workspace = data?.data;

  const hourlyNaira = workspace
    ? (workspace.hourlyRate / 100).toLocaleString("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0,
      })
    : "";

  return (
    <DashboardLayout>
      <div className="mb-6">
        <Link
          href="/workspaces"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to workspaces
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 h-72 animate-pulse" />
          <div className="bg-white rounded-xl border border-gray-100 h-48 animate-pulse" />
        </div>
      ) : isError || !workspace ? (
        <div className="text-center py-20 text-gray-500">
          <MapPin className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Workspace not found</p>
          <Link
            href="/workspaces"
            className="text-sm text-gray-500 underline mt-2 inline-block"
          >
            Browse all workspaces
          </Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-5">
            {/* Hero image */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="h-56 bg-gradient-to-br from-gray-100 to-gray-200">
                {workspace.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={workspace.images[0]}
                    alt={workspace.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MapPin className="w-12 h-12 text-gray-300" />
                  </div>
                )}
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                      {TYPE_LABELS[workspace.type] ?? workspace.type}
                    </span>
                    <h1 className="text-xl font-bold text-gray-900 mt-1">
                      {workspace.name}
                    </h1>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold text-gray-900">
                      {hourlyNaira}
                    </p>
                    <p className="text-xs text-gray-400">per hour</p>
                  </div>
                </div>

                {workspace.description && (
                  <p className="text-sm text-gray-600 mt-4 leading-relaxed">
                    {workspace.description}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-4">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {workspace.totalSeats} total seat
                    {workspace.totalSeats !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Amenities */}
            {workspace.amenities && workspace.amenities.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">
                  Amenities
                </h2>
                <ul className="grid grid-cols-2 gap-2">
                  {workspace.amenities.map((amenity) => (
                    <li
                      key={amenity}
                      className="flex items-center gap-2 text-sm text-gray-600"
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      {amenity}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Additional images */}
            {workspace.images && workspace.images.length > 1 && (
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">
                  Gallery
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  {workspace.images.slice(1).map((img, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={img}
                      alt={`${workspace.name} ${i + 2}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Booking sidebar */}
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-100 p-6 sticky top-8">
              <h2 className="text-sm font-semibold text-gray-900 mb-1">
                Ready to book?
              </h2>
              <p className="text-xs text-gray-500 mb-5">
                Choose your dates and plan after clicking below.
              </p>

              <div className="space-y-3 mb-5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Hourly rate</span>
                  <span className="font-medium text-gray-900">{hourlyNaira}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Availability</span>
                  <span
                    className={`font-medium ${
                      workspace.isActive
                        ? "text-green-600"
                        : "text-red-500"
                    }`}
                  >
                    {workspace.isActive ? "Available" : "Unavailable"}
                  </span>
                </div>
              </div>

              {workspace.isActive ? (
                <Link
                  href={`/bookings/new?workspaceId=${workspace.id}`}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <CalendarPlus className="w-4 h-4" />
                  Book this space
                </Link>
              ) : (
                <button
                  disabled
                  className="w-full py-2.5 bg-gray-100 text-gray-400 text-sm font-medium rounded-lg cursor-not-allowed"
                >
                  Not available
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
