"use client";

import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useGetAdminEvents } from "@/lib/react-query/hooks/admin/events/useGetAdminEvents";
import { useCreateEvent } from "@/lib/react-query/hooks/admin/events/useCreateEvent";
import { useCancelEvent } from "@/lib/react-query/hooks/admin/events/useCancelEvent";
import { Calendar, Plus, X } from "lucide-react";

const emptyForm = { title: "", description: "", host: "", startDate: "", endDate: "", capacity: 30, isPublic: true };

export default function AdminEventsPage() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useGetAdminEvents();
  const createEvent = useCreateEvent();
  const cancelEvent = useCancelEvent();
  const events = (data as any)?.data ?? (data as any) ?? [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createEvent.mutateAsync(form);
    setShowModal(false);
    setForm(emptyForm);
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-500 text-sm mt-1">Manage hub events and RSVPs.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800"
        >
          <Plus className="w-4 h-4" /> Create Event
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (Array.isArray(events) ? events : []).length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No events yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {["Title", "Start Date", "Capacity", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(Array.isArray(events) ? events : []).map((ev: any) => (
                <tr key={ev.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{ev.title}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(ev.startDate || ev.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-500">{ev.capacity ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${ev.isCancelled ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
                      {ev.isCancelled ? "Cancelled" : "Upcoming"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!ev.isCancelled && (
                      <button
                        onClick={() => { if (confirm("Cancel this event?")) cancelEvent.mutate(ev.id); }}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-semibold text-gray-900">Create Event</h2>
              <button onClick={() => setShowModal(false)}><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-3">
              {[
                { label: "Title", key: "title", type: "text" },
                { label: "Host Name", key: "host", type: "text" },
                { label: "Start Date & Time", key: "startDate", type: "datetime-local" },
                { label: "End Date & Time", key: "endDate", type: "datetime-local" },
                { label: "Capacity", key: "capacity", type: "number" },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type={type}
                    value={(form as any)[key]}
                    onChange={(e) => setForm({ ...form, [key]: type === "number" ? +e.target.value : e.target.value })}
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg">Cancel</button>
                <button type="submit" disabled={createEvent.isPending} className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg disabled:opacity-50">
                  {createEvent.isPending ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
