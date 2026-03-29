export interface Booking {
  id: string;
  userId: string;
  workspaceId: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  seatCount: number;
  totalAmountKobo: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  workspace?: {
    id: string;
    name: string;
    type: string;
  };
}

export interface Payment {
  id: string;
  userId: string;
  bookingId?: string;
  amountKobo: number;
  status: "PENDING" | "SUCCESSFUL" | "FAILED" | "REFUNDED";
  reference?: string;
  provider?: string;
  createdAt: string;
  updatedAt: string;
  booking?: {
    id: string;
    workspaceId: string;
    workspace?: {
      id: string;
      name: string;
    };
  };
}

export interface MemberDashboardData {
  stats: {
    activeBookings: number;
    totalSpentKobo: number;
    invoiceCount: number;
    lastCheckIn: string | null;
  };
  recentBookings: Booking[];
  recentPayments: Payment[];
}
