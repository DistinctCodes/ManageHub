export type InvoiceStatus = "PAID" | "PENDING" | "CANCELLED";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  amount: number;
  currency: string;
  issueDate: string;
  paymentDate?: string;
  createdAt: string;
  updatedAt: string;
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
