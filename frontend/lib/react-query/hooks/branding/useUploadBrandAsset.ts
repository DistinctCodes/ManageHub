"use client";

import { useMutation } from "@tanstack/react-query";
import { mutationKeys } from "@/lib/react-query/keys/mutationKeys";
import { toast } from "sonner";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:6001/api";

async function uploadAsset(
  endpoint: string,
  file: File
): Promise<{ logoUrl?: string; faviconUrl?: string }> {
  const form = new FormData();
  form.append("file", file);

  const token =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("auth-storage") || "{}")?.state
          ?.accessToken
      : null;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  if (!res.ok) throw new Error("Upload failed");
  const json = await res.json();
  return json.data;
}

export const useUploadLogo = (onUploaded: (url: string) => void) =>
  useMutation({
    mutationKey: mutationKeys.branding.uploadLogo,
    mutationFn: (file: File) =>
      uploadAsset("/hub-settings/branding/upload-logo", file),
    onSuccess: (data) => {
      if (data.logoUrl) onUploaded(data.logoUrl);
    },
    onError: () => toast.error("Logo upload failed."),
  });

export const useUploadFavicon = (onUploaded: (url: string) => void) =>
  useMutation({
    mutationKey: mutationKeys.branding.uploadFavicon,
    mutationFn: (file: File) =>
      uploadAsset("/hub-settings/branding/upload-favicon", file),
    onSuccess: (data) => {
      if (data.faviconUrl) onUploaded(data.faviconUrl);
    },
    onError: () => toast.error("Favicon upload failed."),
  });
