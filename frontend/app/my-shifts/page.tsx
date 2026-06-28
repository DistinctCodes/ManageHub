"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock, CalendarDays } from "lucide-react";
import api from "@/lib/axios";

type Shift = {
  id: string;
  startTime: string;
  endTime: string;
  roleName: string;
  notes: string | null;
};

export default function MyShiftsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-shifts"],
    queryFn: async () => {
      const r = await api.get("/shifts/this-week");
      return r.data.data as Shift[];
    },
  });

  const shifts = data ?? [];

  const groupByDay = () => {
    const groups: Record<string, Shift[]> = {};
    shifts.forEach((s) => {
      const day = new Date(s.startTime).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "2-digit",
        month: "short",
      });
      if (!groups[day]) groups[day] = [];
      groups[day].push(s);
    });
    return groups;
  };

  const groups = groupByDay();

  if (isLoading) {
    return (
      <div className="p-6 text-center text-gray-500 text-sm">Loading shifts…</div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <CalendarDays size={24} className="text-indigo-600" />
        <h1 className="text-2xl font-bold">My Shifts This Week</h1>
      </div>

      {shifts.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Clock size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No shifts scheduled this week</p>
        </div>
      ) : (
        Object.entries(groups).map(([day, dayShifts]) => (
          <div key={day} className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              {day}
            </h2>
            {dayShifts.map((s) => (
              <div
                key={s.id}
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-start justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900">{s.roleName}</p>
                  {s.notes && (
                    <p className="text-xs text-gray-500 mt-0.5">{s.notes}</p>
                  )}
                </div>
                <div className="text-sm text-indigo-600 font-medium text-right">
                  <div>
                    {new Date(s.startTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="text-gray-400">
                    →{" "}
                    {new Date(s.endTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
