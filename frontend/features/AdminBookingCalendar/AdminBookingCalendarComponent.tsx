import React from "react";
import { useAdminBookingCalendar } from "./useAdminBookingCalendar";
export const AdminBookingCalendarComponent: React.FC = () => {
  const { view, slots, setView } = useAdminBookingCalendar();
  return (
    <div className="p-4 border rounded">
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-bold">Admin Calendar</h2>
        <div>
          <button
            onClick={() => setView("day")}
            className={`px-3 py-1 ${view === "day" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          >
            Day
          </button>
          <button
            onClick={() => setView("week")}
            className={`px-3 py-1 ml-2 ${view === "week" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          >
            Week
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {/* Render slots based on view */}
        <div className="col-span-7 text-center p-8 bg-gray-50">
          No bookings for this {view}
        </div>
      </div>
    </div>
  );
};
