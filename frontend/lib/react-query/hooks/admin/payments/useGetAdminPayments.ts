import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { Payment, PaymentStatus, PaymentProvider } from "@/lib/types/payment";

interface AdminPaymentsParams {
  page?: number;
  limit?: number;
  status?: PaymentStatus | "";
  provider?: PaymentProvider | "";
  from?: string;
  to?: string;
}

interface AdminPaymentsResponse {
  success: boolean;
  data: Payment[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const useGetAdminPayments = (params: AdminPaymentsParams = {}) => {
  const { page = 1, limit = 20, status, provider, from, to } = params;
  return useQuery({
    queryKey: queryKeys.admin.payments.list({ page, limit, status, provider, from, to }),
    queryFn: () => {
      const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (status) query.set("status", status);
      if (provider) query.set("provider", provider);
      if (from) query.set("from", from);
      if (to) query.set("to", to);
      return apiClient.get<AdminPaymentsResponse>(`/payments?${query.toString()}`);
    },
  });
};
