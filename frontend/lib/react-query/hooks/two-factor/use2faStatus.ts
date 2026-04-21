"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";

interface TwoFaStatus {
  enabled: boolean;
  backupCodesRemaining: number;
}

export const use2faStatus = () => {
  return useQuery({
    queryKey: queryKeys.twoFactor.status,
    queryFn: () =>
      apiClient.get<{ success: boolean; data: TwoFaStatus }>("/auth/2fa/status"),
  });
};
