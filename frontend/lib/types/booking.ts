export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED";

export type PlanType =
  | "HOURLY"
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "CUSTOM";

export interface Booking {
  id: string;
  workspaceId: string;
  workspaceName?: string;
  memberName?: string;
  planType: PlanType | string;
  startDate: string;
  endDate: string;
  seatCount: number;
  seats?: number;
  totalAmount: number;
  status: BookingStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBookingDto {
  workspaceId: string;
  planType: PlanType;
  startDate: string;
  endDate: string;
  seatCount?: number;
}
