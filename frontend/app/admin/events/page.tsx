"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { apiClient } from "@/lib/apiClient";

interface AdminEvent {
  id: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "CANCELLED";
  startAt: string;
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<AdminEvent[]>([]);

  useEffect(() => {
    apiClient
      .get<AdminEvent[]>("/admin/events")
      .then(setEvents)
      .catch(() => setEvents([]));
  }, []);

  return (
    <DashboardLayout>
      <h1 className="text-xl font-semibold mb-4">Events</h1>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Title</th>
            <th className="py-2">Status</th>
            <th className="py-2">Starts</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-b">
              <td className="py-2">{event.title}</td>
              <td className="py-2">{event.status}</td>
              <td className="py-2">{new Date(event.startAt).toLocaleString("en-NG")}</td>
            </tr>
          ))}
          {events.length === 0 && (
            <tr><td colSpan={3} className="py-4 text-center text-gray-500">No events yet.</td></tr>
          )}
        </tbody>
      </table>
    </DashboardLayout>
  );
}
