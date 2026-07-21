"use client";

import { useState } from "react";

interface Member {
  id: number;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
  joined: string;
}

const SAMPLE_MEMBERS: Member[] = [
  { id: 1, name: "Alice Johnson", email: "alice@example.com", role: "Admin", status: "active", joined: "2024-01-10" },
  { id: 2, name: "Bob Smith", email: "bob@example.com", role: "Member", status: "active", joined: "2024-02-15" },
  { id: 3, name: "Carol White", email: "carol@example.com", role: "Member", status: "inactive", joined: "2024-03-01" },
  { id: 4, name: "David Lee", email: "david@example.com", role: "Moderator", status: "active", joined: "2024-03-20" },
  { id: 5, name: "Eve Martinez", email: "eve@example.com", role: "Member", status: "active", joined: "2024-04-05" },
  { id: 6, name: "Frank Brown", email: "frank@example.com", role: "Member", status: "inactive", joined: "2024-04-18" },
  { id: 7, name: "Grace Kim", email: "grace@example.com", role: "Admin", status: "active", joined: "2024-05-02" },
  { id: 8, name: "Henry Davis", email: "henry@example.com", role: "Member", status: "active", joined: "2024-05-14" },
];

const PAGE_SIZE = 5;

type SortKey = keyof Pick<Member, "name" | "role" | "status" | "joined">;

export default function MembersPage() {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);

  const filtered = SAMPLE_MEMBERS.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.role.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
    setPage(1);
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="ml-1 text-gray-400">↕</span>;
    return <span className="ml-1">{sortAsc ? "↑" : "↓"}</span>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Members</h1>

      <input
        type="text"
        placeholder="Search by name, email or role..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="w-full mb-4 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 cursor-pointer" onClick={() => toggleSort("name")}>
                Name <SortIcon col="name" />
              </th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3 cursor-pointer" onClick={() => toggleSort("role")}>
                Role <SortIcon col="role" />
              </th>
              <th className="px-4 py-3 cursor-pointer" onClick={() => toggleSort("status")}>
                Status <SortIcon col="status" />
              </th>
              <th className="px-4 py-3 cursor-pointer" onClick={() => toggleSort("joined")}>
                Joined <SortIcon col="joined" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">No members found.</td>
              </tr>
            ) : (
              paginated.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-gray-600">{m.email}</td>
                  <td className="px-4 py-3">{m.role}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        m.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{m.joined}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
        <span>
          Showing {paginated.length} of {sorted.length} members
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
          >
            Prev
          </button>
          <span className="px-3 py-1">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
