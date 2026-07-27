import { useState } from "react";
import { BookingSlot } from "./AdminBookingCalendarTypes";
export const useAdminBookingCalendar = () => {
  const [view, setView] = useState<"day" | "week">("week");
  const [slots] = useState<BookingSlot[]>([]);
  return { view, slots, setView };
};
