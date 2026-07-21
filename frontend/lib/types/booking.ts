export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED";

export type PlanType =
  | "HOURLY"
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "YEARLY";

export interface Booking {
  id: string;
  userId: string;
  workspaceId: string;
  planType: PlanType;
  startDate: string;
  endDate: string;
  totalAmount: number; // in kobo
  status: BookingStatus;
  seatCount: number;
  notes?: string;
  sorobanEscrowId?: string;
  createdAt: string;
  updatedAt: string;
  workspace?: {
    id: string;
    name: string;
    type: string;
  };
}

export interface CreateBookingDto {
  workspaceId: string;
  planType: PlanType;
  startDate: string;
  endDate: string;
  seatCount: number;
  notes?: string;
}

export interface PriceEstimate {
  totalAmount: number; // kobo
  totalAmountNaira: number;
  planType: PlanType;
  seatCount: number;
  startDate: string;
  endDate: string;
}
