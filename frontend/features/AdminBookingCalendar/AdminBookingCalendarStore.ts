import { createContext } from "react";
import { CalendarState, BookingSlot } from "./AdminBookingCalendarTypes";
export interface CalendarStore extends CalendarState {
  setView: (view: "day" | "week") => void;
}
export const AdminBookingCalendarContext = createContext<
  CalendarStore | undefined
>(undefined);
