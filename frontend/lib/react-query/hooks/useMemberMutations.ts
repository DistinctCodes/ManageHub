import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { memberKeys } from "../keys/memberKeys";

export type MemberAction = "SUSPEND" | "ACTIVATE" | "PROMOTE" | "DEMOTE";

export function useMemberMutations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, action }: { memberId: string; action: MemberAction }) => {
      const endpoints: Record<MemberAction, string> = {
        SUSPEND: `/users/${memberId}/suspend`,
        ACTIVATE: `/users/${memberId}/activate`,
        PROMOTE: `/users/${memberId}/promote`,
        DEMOTE: `/users/${memberId}/demote`,
      };
      const endpoint = endpoints[action];
      if (!endpoint) {
        throw new Error(`Invalid member action: ${action}`);
      }

      const data = await apiClient.patch<unknown>(endpoint);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.all });
    },
  });
}