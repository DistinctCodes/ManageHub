"use client";

// frontend/lib/react-query/hooks/invoices/useGetMyInvoices.ts

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import type { InvoiceListResponse, InvoiceStatus } from "@/lib/types/invoice";

export interface UseGetMyInvoicesParams {
  page?: number;
  limit?: number;
  status?: InvoiceStatus | "ALL";
}

/**
 * useGetMyInvoices
 *
 * Fetches the authenticated member's paginated invoice list.
 * Maps to: GET /invoices?page=&limit=&status=
 *
 * @example
 * const { data, isLoading } = useGetMyInvoices({ page: 1, limit: 10, status: "PAID" });
 * data?.data       // Invoice[]
 * data?.meta       // { total, page, limit, totalPages }
 */
export function useGetMyInvoices({
  page = 1,
  limit = 10,
  status,
}: UseGetMyInvoicesParams = {}) {
  // Normalise "ALL" → omit the param so the backend returns everything
  const resolvedStatus =
    !status || status === "ALL" ? undefined : status;

  const params = { page, limit, ...(resolvedStatus && { status: resolvedStatus }) };

  return useQuery<InvoiceListResponse>({
    queryKey: queryKeys.invoices.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(resolvedStatus && { status: resolvedStatus }),
      }).toString();

      return apiClient.get<InvoiceListResponse>(`/invoices?${qs}`);
    },
    // Keep previous page data visible while the next page loads
    placeholderData: (prev: InvoiceListResponse | undefined) => prev,
    staleTime: 30_000, // 30 s — invoices don't change frequently
  });
}
