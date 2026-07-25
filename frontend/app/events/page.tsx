"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Calendar, MapPin, Users } from "lucide-react";
import Link from "next/link";

interface HubEvent {
  id: string;
  slug: string;
  title: string;
  description?: string;
  venue?: string;
  startDate: string;
  capacity?: number;
  spotsLeft?: number;
  rsvpStatus?: "going" | "waitlisted" | null;
  coverImage?: string;
}

interface EventsResponse {
  success: boolean;
  data: HubEvent[];
}

function useEvents() {
  return useQuery({
    queryKey: ["events", "list"],
    queryFn: () => apiClient.get<EventsResponse>("/events?status=published"),
  });
}

export default function EventsPage() {
  const { data, isLoading } = useEvents();
  const events = data?.data ?? [];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <p className="text-gray-500 mt-1 text-sm">Upcoming hub events.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 h-28 animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Calendar className="w-10 h-10 text-gray-200 mb-4" />
          <p className="text-sm font-medium text-gray-500">No upcoming events.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <Link
              key={ev.id}
              href={`/events/${ev.slug}`}
              className="block bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{ev.title}</p>
                  <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(ev.startDate).toLocaleDateString("en", {
                        weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                    {ev.venue && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {ev.venue}
                      </span>
                    )}
                    {ev.capacity != null && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {ev.spotsLeft != null ? `${ev.spotsLeft} spots left` : `${ev.capacity} capacity`}
                      </span>
                    )}
                  </div>
                </div>
                {ev.rsvpStatus && (
                  <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                    ev.rsvpStatus === "going" ? "bg-emerald-50 text-emerald-600" : "bg-yellow-50 text-yellow-600"
                  }`}>
                    {ev.rsvpStatus === "going" ? "Going" : "Waitlisted"}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
