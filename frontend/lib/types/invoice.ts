export type InvoiceStatus = "PENDING" | "PAID" | "CANCELLED";

export interface LineItem {
  description: string;
  startDate?: string;
  endDate?: string;
  seatCount?: number;
  amountKobo: number;
  amountNaira: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  userId: string;
  bookingId: string;
  paymentId?: string;
  amountKobo: number;
  currency: string;
  status: InvoiceStatus;
  paidAt?: string;
  lineItems?: LineItem[];
  createdAt: string;
  updatedAt: string;
}
