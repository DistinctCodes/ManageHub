"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { toast } from "sonner";

type MemberAction = "suspend" | "activate" | "make-admin" | "make-user";

export const useUpdateMemberStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: MemberAction }) => {
      if (action === "suspend") {
        return apiClient.patch(`/users/${id}`, { isSuspended: true });
      } else if (action === "activate") {
        return apiClient.patch(`/users/${id}`, {
          isSuspended: false,
          isActive: true,
        });
      } else if (action === "make-admin") {
        return apiClient.patch(`/users/${id}`, { role: "admin" });
      } else {
        return apiClient.patch(`/users/${id}`, { role: "user" });
      }
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.members.all });
      const labels: Record<MemberAction, string> = {
        suspend: "Member suspended",
        activate: "Member activated",
        "make-admin": "Promoted to admin",
        "make-user": "Demoted to user",
      };
      toast.success(labels[action]);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update member");
    },
  });
};
