import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";

export const useRefundPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<{ message: string; data: unknown }, undefined>(
        `/payments/${id}/refund`,
        undefined
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.payments.all });
    },
  });
};
