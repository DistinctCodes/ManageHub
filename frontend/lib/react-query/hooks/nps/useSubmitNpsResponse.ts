"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { mutationKeys } from "@/lib/react-query/keys/mutationKeys";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { toast } from "sonner";

export interface NpsResponsePayload {
  surveyId: string;
  score: number;
  comment?: string;
}

export const useSubmitNpsResponse = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.nps.respond,
    mutationFn: (payload: NpsResponsePayload) =>
      apiClient.post<{ success: boolean }, NpsResponsePayload>(
        "/nps/respond",
        payload
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.nps.pending });
      toast.success("Thanks for your feedback!");
      onSuccess?.();
    },
    onError: () => {
      toast.error("Failed to submit feedback. Please try again.");
    },
  });
};
