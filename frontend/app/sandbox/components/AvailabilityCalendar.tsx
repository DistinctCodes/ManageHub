"use client";

import { useState } from "react";

interface AvailabilityEntry {
  date: string;
  availableSeats: number;
}

interface Props {
  availabilityData: AvailabilityEntry[];
  onDateSelect?: (date: string) => void;
  selectedDate?: string;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export function AvailabilityCalendar({ availabilityData, onDateSelect, selectedDate }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const availMap = new Map(availabilityData.map((e) => [e.date, e.availableSeats]));

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <button onClick={prevMonth} className="rounded p-1 hover:bg-gray-100 text-gray-600">‹</button>
        <span className="text-sm font-semibold text-gray-800">{MONTHS[month]} {year}</span>
        <button onClick={nextMonth} className="rounded p-1 hover:bg-gray-100 text-gray-600">›</button>
      </div>

      {/* Day labels */}
      <div className="mb-1 grid grid-cols-7 text-center text-xs font-medium text-gray-400">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => <span key={d}>{d}</span>)}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
        {cells.map((day, idx) => {
          if (!day) return <span key={idx} />;
          const dateStr = toDateStr(year, month, day);
          const isToday = dateStr === toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
          const seats = availMap.get(dateStr);
          const isAvailable = seats !== undefined && seats > 0;
          const isBooked = seats === 0;
          const isSelected = dateStr === selectedDate;

          return (
            <button
              key={idx}
              disabled={!isAvailable}
              onClick={() => isAvailable && onDateSelect?.(dateStr)}
              className={[
                "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs transition-colors",
                isSelected ? "bg-blue-600 text-white font-bold ring-2 ring-blue-600" : "",
                !isSelected && isToday ? "font-bold ring-2 ring-blue-400" : "",
                !isSelected && isAvailable ? "bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer" : "",
                !isSelected && isBooked ? "bg-red-100 text-red-600 cursor-not-allowed" : "",
                !isSelected && !isAvailable && !isBooked ? "text-gray-300 cursor-default" : "",
              ].join(" ")}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-green-100" />Available</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-red-100" />Booked</span>
      </div>
    </div>
  );
}
