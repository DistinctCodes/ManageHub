"use client";
import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { MemberStats } from "@/components/dashboard/admin/MemberStats";
import { MembersTable } from "@/components/dashboard/admin/MembersTable";
import { Search } from "lucide-react";

export default function AdminMembersPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Members</h1>
        <p className="text-gray-500 text-sm">Manage users and roles.</p>
      </div>
      <MemberStats />
      <div className="bg-white rounded-xl border border-gray-100 mt-8 overflow-hidden">
        <div className="p-4 flex gap-4 border-b border-gray-50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input 
              value={search}
              aria-label="Search members"
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg outline-none focus:ring-1 focus:ring-gray-200" 
              placeholder="Search..." 
            />
          </div>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
            className="border rounded-lg px-3 py-2 text-sm outline-none"
            aria-label="Filter members by status"
          >
            <option value="ALL">All</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
        <MembersTable search={search} filter={filter} page={page} setPage={setPage} />
      </div>
    </DashboardLayout>
  );
}