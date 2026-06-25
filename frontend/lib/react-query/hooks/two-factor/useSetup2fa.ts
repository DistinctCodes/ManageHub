"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

interface Setup2faResponse {
  success: boolean;
  data: {
    secret: string;
    qrCodeDataUrl: string;
  };
}

export const useSetup2fa = () => {
  return useMutation({
    mutationFn: () =>
      apiClient.post<Setup2faResponse>("/auth/2fa/setup", {}),
  });
};
