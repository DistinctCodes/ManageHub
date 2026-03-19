import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { memberKeys } from "../keys/memberKeys";
import { Member, MemberStats, MembersResponse } from "@/lib/types/member";

interface BackendMember extends Omit<Member, "firstName" | "lastName"> {
  firstname: string;
  lastname: string;
}

interface BackendMembersResponse extends Omit<MembersResponse, "members"> {
  members: BackendMember[];
}

function mapBackendMember(member: BackendMember): Member {
  const { firstname, lastname, ...rest } = member;
  return {
    ...rest,
    firstName: firstname,
    lastName: lastname,
  };
}

export function useGetMemberStats() {
  return useQuery<MemberStats>({
    queryKey: memberKeys.stats(),
    queryFn: async () => {
      const data = await apiClient.get<MemberStats>("/dashboard/member-stats");
      return data;
    },
  });
}

export function useGetAllMembers({ search, status, page }: { search: string, status: string, page: number }) {
  return useQuery<MembersResponse>({
    queryKey: memberKeys.list({ search, status, page }),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(search && { search }),
        ...(status !== "ALL" && { status }),
      });
      const data = await apiClient.get<BackendMembersResponse>(`/users?${params.toString()}`);

      return {
        ...data,
        members: data.members.map(mapBackendMember),
      };
    },
    placeholderData: (prev) => prev,
  });
}