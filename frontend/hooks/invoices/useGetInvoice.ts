"use client";

// frontend/lib/react-query/hooks/invoices/useGetInvoice.ts

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import type { Invoice } from "@/lib/types/invoice";

/**
 * useGetInvoice
 *
 * Fetches a single invoice by ID with full relations (member, booking).
 * Maps to: GET /invoices/:id
 *
 * The query is disabled automatically when `id` is undefined/empty,
 * so it is safe to call this hook before the route param is resolved.
 *
 * @example
 * const { data: invoice, isLoading } = useGetInvoice(id);
 */
export function useGetInvoice(id: string | undefined) {
  return useQuery<Invoice>({
    queryKey: queryKeys.invoices.detail(id ?? ""),
    queryFn: () => apiClient.get<Invoice>(`/invoices/${id}`),
    enabled: !!id,
    staleTime: 60_000, // 1 min — a single invoice rarely changes after issue
    retry: (failureCount, error) => {
      // Don't retry on 404 — invoice simply doesn't exist
      if (error instanceof Error && error.message.includes("404")) return false;
      return failureCount < 2;
    },
  });
}