"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { mutationKeys } from "@/lib/react-query/keys/mutationKeys";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { toast } from "sonner";

export interface UpdateBrandingPayload {
  hubName?: string;
  primaryColorHex?: string;
  logoUrl?: string;
  faviconUrl?: string;
}

export const useUpdateBranding = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.branding.update,
    mutationFn: (payload: UpdateBrandingPayload) =>
      apiClient.patch<unknown, UpdateBrandingPayload>(
        "/hub-settings/branding",
        payload
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.branding.config });
      toast.success("Branding updated successfully.");
    },
    onError: () => {
      toast.error("Failed to save branding. Please try again.");
    },
  });
};
