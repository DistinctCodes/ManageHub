// frontend/lib/types/invoice.ts
// Shared Invoice types used by hooks and pages.

export type InvoiceStatus = "PAID" | "PENDING" | "CANCELLED";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  amount: number;
  currency: string;
  issueDate: string;        // ISO date string
  paymentDate?: string;     // ISO date string, present when PAID
  createdAt: string;
  updatedAt: string;

  // Relations (populated in detail view)
  member?: {
    id: string;
    name: string;
    email: string;
  };
  booking?: {
    id: string;
    workspaceName: string;
    planType: string;
    startDate: string;
    endDate: string;
    seatCount: number;
  };
}

export interface InvoiceMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InvoiceListResponse {
  data: Invoice[];
  meta: InvoiceMeta;
}