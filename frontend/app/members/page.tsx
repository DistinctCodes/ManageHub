"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Users, Search, ExternalLink } from "lucide-react";

interface DirectoryMember {
  id: string;
  firstname: string;
  lastname: string;
  headline?: string;
  company?: string;
  skills?: string[];
  profilePicture?: string;
}

interface DirectoryResponse {
  success: boolean;
  data: DirectoryMember[];
}

function useDirectory(search: string) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  return useQuery({
    queryKey: ["directory", "list", search],
    queryFn: () =>
      apiClient.get<DirectoryResponse>(`/members/directory?${params}`),
  });
}

export default function MembersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useDirectory(search);
  const members = data?.data ?? [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Member Directory</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Connect with fellow hub members.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6 max-w-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search members..."
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Search
        </button>
      </form>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 h-32 animate-pulse" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="w-10 h-10 text-gray-200 mb-4" />
          <p className="text-sm font-medium text-gray-500">
            {search ? "No members found for your search." : "No members in the directory yet."}
          </p>
          {!search && (
            <a href="/profile" className="mt-2 text-sm text-gray-900 underline flex items-center gap-1">
              Update your profile to appear here <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m) => {
            const initials = `${m.firstname?.[0] ?? ""}${m.lastname?.[0] ?? ""}`;
            return (
              <div key={m.id} className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-3">
                  {m.profilePicture ? (
                    <img src={m.profilePicture} alt={initials} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {m.firstname} {m.lastname}
                    </p>
                    {m.headline && <p className="text-xs text-gray-400 truncate">{m.headline}</p>}
                    {m.company && <p className="text-xs text-gray-400 truncate">{m.company}</p>}
                  </div>
                </div>
                {m.skills && m.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {m.skills.slice(0, 3).map((s) => (
                      <span key={s} className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full border border-gray-100">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
