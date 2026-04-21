"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";

export interface MemberRow {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  role: string;
  isActive: boolean;
  isSuspended: boolean;
  isVerified: boolean;
  membershipStatus?: string;
  createdAt: string;
  profilePicture?: string;
}

interface MembersResponse {
  success: boolean;
  data: MemberRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export const useGetAllMembers = (
  page = 1,
  limit = 15,
  search?: string
) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set("search", search);

  return useQuery({
    queryKey: queryKeys.admin.members.list({ page, limit, search }),
    queryFn: () =>
      apiClient.get<MembersResponse>(`/members?${params}`),
  });
};
