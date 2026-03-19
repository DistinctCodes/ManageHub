import type { Workspace } from "@/lib/types/workspace";

export type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

export type PlanType = "HOURLY" | "DAILY" | "MONTHLY";

export interface Booking {
  id: string;
  planType: PlanType;
  startDate: string;
  endDate: string;
  seatCount: number;
  totalAmountKobo: number;
  status: BookingStatus;
  notes?: string;
  userId: string;
  workspaceId: string;
  workspace?: Workspace;
  user?: {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}
