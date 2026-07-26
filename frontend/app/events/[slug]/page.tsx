"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Calendar, MapPin, Users, ArrowLeft } from "lucide-react";

interface EventDetail {
  id: string;
  slug: string;
  title: string;
  description?: string;
  venue?: string;
  startDate: string;
  capacity?: number;
  attendeeCount?: number;
  rsvpStatus?: "going" | "waitlisted" | null;
  waitlistPosition?: number;
  ticketPriceKobo?: number;
}

export default function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["events", slug],
    queryFn: () => apiClient.get<{ success: boolean; data: EventDetail }>(`/events/${slug}`),
  });

  const rsvp = useMutation({
    mutationFn: (action: "rsvp" | "cancel") =>
      apiClient.post(`/events/${slug}/${action}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      setMsg({ type: "success", text: "RSVP updated." });
    },
    onError: () => setMsg({ type: "error", text: "Something went wrong." }),
  });

  const ev = data?.data;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!ev) {
    return (
      <DashboardLayout>
        <p className="text-gray-500 text-sm">Event not found.</p>
      </DashboardLayout>
    );
  }

  const isFull = ev.capacity != null && (ev.attendeeCount ?? 0) >= ev.capacity;
  const isPaid = ev.ticketPriceKobo != null && ev.ticketPriceKobo > 0;

  return (
    <DashboardLayout>
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to events
      </button>

      <div className="max-w-2xl bg-white rounded-xl border border-gray-100 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{ev.title}</h1>

        <div className="flex flex-wrap gap-3 text-sm text-gray-400 mb-5">
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {new Date(ev.startDate).toLocaleDateString("en", {
              weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </span>
          {ev.venue && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {ev.venue}</span>}
          {ev.capacity != null && (
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {ev.attendeeCount ?? 0} / {ev.capacity} attending
            </span>
          )}
        </div>

        {ev.description && <p className="text-sm text-gray-600 mb-6 whitespace-pre-line">{ev.description}</p>}

        {msg && (
          <p className={`text-sm mb-4 ${msg.type === "success" ? "text-emerald-600" : "text-red-500"}`}>{msg.text}</p>
        )}

        {ev.rsvpStatus === "going" ? (
          <button
            onClick={() => rsvp.mutate("cancel")}
            disabled={rsvp.isPending}
            className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {rsvp.isPending ? "Cancelling..." : "Cancel RSVP"}
          </button>
        ) : ev.rsvpStatus === "waitlisted" ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-yellow-600 font-medium">
              You&apos;re waitlisted{ev.waitlistPosition ? ` (#${ev.waitlistPosition})` : ""}.
            </span>
            <button onClick={() => rsvp.mutate("cancel")} disabled={rsvp.isPending}
              className="text-sm text-gray-400 underline hover:text-gray-700 disabled:opacity-50">
              Leave waitlist
            </button>
          </div>
        ) : (
          <button
            onClick={() => rsvp.mutate("rsvp")}
            disabled={rsvp.isPending}
            className="px-5 py-2.5 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {rsvp.isPending ? "..." : isFull ? "Join Waitlist" : isPaid ? `Buy ticket – ₦${(ev.ticketPriceKobo! / 100).toLocaleString()}` : "RSVP"}
          </button>
        )}
      </div>
    </DashboardLayout>
  );
}
