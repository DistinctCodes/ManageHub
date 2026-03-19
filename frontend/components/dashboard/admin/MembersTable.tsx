"use client";

import { useEffect } from "react";
import { useGetAllMembers } from "@/lib/react-query/hooks/members";
import { MemberActionButtons } from "./MemberActionButtons";
import { TablePagination } from "./TablePagination"; // Ensure this component is created
import type { Member } from "@/lib/types/member";

interface Props {
  search: string;
  filter: string;
  page: number;
  setPage: (p: number) => void;
}

export function MembersTable({ search, filter, page, setPage }: Props) {
  const { data, isLoading, isError, error, refetch } = useGetAllMembers({
    search,
    status: filter,
    page,
  });

  useEffect(() => {
    if (isError && error) {
      console.error("Failed to fetch members", error);
    }
  }, [isError, error]);

  // 1. Loading Skeleton State
  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 animate-pulse">
            <div className="h-12 bg-gray-100 rounded-lg w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  if (isError || error) {
    const message =
      error instanceof Error
        ? error.message
        : "We could not load members right now. Please try again.";

    return (
      <div className="p-20 text-center">
        <p className="text-red-600 font-medium">Unable to load members.</p>
        <p className="text-gray-500 text-sm mt-1">{message}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 inline-flex items-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
        >
          Retry
        </button>
      </div>
    );
  }

  // 2. Empty State
  if (!data?.members?.length) {
    return (
      <div className="p-20 text-center">
        <p className="text-gray-400 font-medium">No members found matching your criteria.</p>
        <p className="text-gray-300 text-sm mt-1">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
          <tr>
            <th className="px-6 py-4">Member</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Role</th>
            <th className="px-6 py-4">Joined</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 bg-white">
          {data.members.map((member: Member) => (
            <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-4">
                <div className="font-medium text-gray-900">
                  {member.firstName} {member.lastName}
                </div>
                <div className="text-gray-400 text-xs">{member.email}</div>
              </td>
              <td className="px-6 py-4">
                <span
                  className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                    member.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  {member.status}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className="text-gray-600 text-[11px] font-semibold bg-gray-100 px-2 py-0.5 rounded">
                  {member.role}
                </span>
              </td>
              <td className="px-6 py-4 text-gray-400 text-xs">
                {new Date(member.createdAt).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 text-right">
                <MemberActionButtons member={member} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 3. Pagination Controls (Uses setPage, fixing the ESLint warning) */}
      <TablePagination
        currentPage={page}
        totalPages={data.totalPages || 1}
        onPageChange={(newPage) => setPage(newPage)}
      />
    </div>
  );
}