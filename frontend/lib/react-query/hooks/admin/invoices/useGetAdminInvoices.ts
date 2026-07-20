import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { Invoice, InvoiceStatus } from "@/lib/types/invoice";

interface AdminInvoicesParams {
  page?: number;
  limit?: number;
  status?: InvoiceStatus | "";
  search?: string;
  from?: string;
  to?: string;
}

interface AdminInvoicesResponse {
  success: boolean;
  data: Invoice[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const useGetAdminInvoices = (params: AdminInvoicesParams = {}) => {
  const { page = 1, limit = 20, status, search, from, to } = params;
  return useQuery({
    queryKey: queryKeys.admin.invoices.list({ page, limit, status, search, from, to }),
    queryFn: () => {
      const query = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status) query.set("status", status);
      if (search) query.set("search", search);
      if (from) query.set("from", from);
      if (to) query.set("to", to);
      return apiClient.get<AdminInvoicesResponse>(`/invoices?${query.toString()}`);
    },
  });
};
