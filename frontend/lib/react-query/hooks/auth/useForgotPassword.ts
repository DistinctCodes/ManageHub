"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { mutationKeys } from "@/lib/react-query/keys/mutationKeys";

type ForgotPasswordBody = {
  email: string;
};

type ForgotPasswordResponse = {
  message: string;
};

export const useForgotPassword = () => {
  return useMutation({
    mutationKey: mutationKeys.auth.forgotPassword,
    mutationFn: async (body: ForgotPasswordBody) => {
      return await apiClient.post<ForgotPasswordResponse, ForgotPasswordBody>(
        "/auth/forgot-password",
        body
      );
    },
  });
};
