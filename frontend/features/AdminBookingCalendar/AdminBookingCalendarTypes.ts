export interface BookingSlot {
  id: string;
  workspaceId: string;
  startTime: string;
  endTime: string;
}
export interface CalendarState {
  view: "day" | "week";
  slots: BookingSlot[];
}
