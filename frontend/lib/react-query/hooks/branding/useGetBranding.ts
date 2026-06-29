"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import type { BrandingConfig } from "@/lib/branding/BrandingContext";

export const useGetBranding = () => {
  return useQuery({
    queryKey: queryKeys.branding.config,
    queryFn: () => apiClient.get<BrandingConfig>("/hub-settings/branding"),
    staleTime: 5 * 60 * 1000,
  });
};
