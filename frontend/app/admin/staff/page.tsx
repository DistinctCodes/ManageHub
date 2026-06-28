"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/lib/axios";

type Shift = {
  id: string;
  staffUserId: string;
  staff?: { fullName: string; email: string };
  startTime: string;
  endTime: string;
  roleName: string;
  notes: string | null;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekStart(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function AdminStaffPage() {
  const qc = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    staffUserId: "",
    startTime: "",
    endTime: "",
    roleName: "",
    notes: "",
  });

  const weekStart = getWeekStart(weekOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59);

  const { data } = useQuery({
    queryKey: ["shifts", weekOffset],
    queryFn: async () => {
      const r = await api.get("/shifts", {
        params: {
          startDate: weekStart.toISOString(),
          endDate: weekEnd.toISOString(),
        },
      });
      return r.data.data as Shift[];
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) => api.post("/shifts", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      setShowModal(false);
      setForm({ staffUserId: "", startTime: "", endTime: "", roleName: "", notes: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/shifts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shifts"] }),
  });

  const shifts = data ?? [];
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Staff Schedule</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <Plus size={16} /> Add Shift
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          className="p-2 rounded hover:bg-gray-100"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-medium">
          {fmt(weekStart)} – {fmt(weekEnd)}
        </span>
        <button
          onClick={() => setWeekOffset((o) => o + 1)}
          className="p-2 rounded hover:bg-gray-100"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              {weekDays.map((d, i) => (
                <th
                  key={i}
                  className="border border-gray-200 px-3 py-2 text-xs font-semibold text-center bg-gray-50 min-w-[120px]"
                >
                  <div>{DAYS[i]}</div>
                  <div className="text-gray-500">{fmt(d)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {weekDays.map((d, i) => {
                const dayShifts = shifts.filter((s) =>
                  isSameDay(new Date(s.startTime), d)
                );
                return (
                  <td
                    key={i}
                    className="border border-gray-200 px-2 py-2 align-top min-h-[100px]"
                  >
                    {dayShifts.map((s) => (
                      <div
                        key={s.id}
                        className="mb-1 rounded bg-indigo-50 border border-indigo-200 px-2 py-1 text-xs"
                      >
                        <div className="font-medium text-indigo-800">
                          {s.staff?.fullName ?? s.staffUserId.slice(0, 8)}
                        </div>
                        <div className="text-indigo-600">{s.roleName}</div>
                        <div className="text-gray-500">
                          {new Date(s.startTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          –
                          {new Date(s.endTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <button
                          onClick={() => deleteMutation.mutate(s.id)}
                          className="text-red-400 hover:text-red-600 mt-1"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h2 className="text-lg font-semibold">Add Shift</h2>
            {[
              { label: "Staff User ID", key: "staffUserId" },
              { label: "Role", key: "roleName" },
              { label: "Notes", key: "notes" },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={(form as any)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <input
                type="datetime-local"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input
                type="datetime-local"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border rounded-lg px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  createMutation.mutate({
                    ...form,
                    startTime: new Date(form.startTime).toISOString(),
                    endTime: new Date(form.endTime).toISOString(),
                  })
                }
                disabled={createMutation.isPending}
                className="flex-1 bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
              >
                {createMutation.isPending ? "Saving…" : "Add Shift"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
