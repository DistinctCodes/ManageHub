"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { Invoice } from "@/lib/types/invoice";

interface InvoicesResponse {
  success: boolean;
  data: Invoice[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const useGetMyInvoices = (page = 1, limit = 10, bookingId?: string) => {
  return useQuery({
    queryKey: queryKeys.invoices.mine({ page, limit, bookingId }),
    queryFn: () => {
      let url = `/invoices?page=${page}&limit=${limit}`;
      if (bookingId) {
        url += `&bookingId=${bookingId}`;
      }
      return apiClient.get<InvoicesResponse>(url);
    },
  });
};
