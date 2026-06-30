"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import CommunityFeed from "@/components/community/CommunityFeed";
import { apiClient } from "@/lib/apiClient";
import { Search, User, X, Linkedin, Twitter, Users, Rss } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Member = {
  id: string;
  firstname: string;
  lastname: string;
  username?: string;
  profilePicture?: string;
  memberSince?: string;
};

type Tab = "feed" | "members";

// ─── Members tab (ported from /members with community API) ────────────────────

function MembersTab() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<{
        data: Member[];
        total: number;
      }>(`/community/members?search=${encodeURIComponent(search)}&limit=50`);
      setMembers(res.data ?? []);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search members by name or username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 text-sm text-gray-900 dark:text-gray-100"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-20 text-gray-500 dark:text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No members found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => setSelectedMember(member)}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 flex items-center gap-3 hover:shadow-sm hover:border-gray-200 dark:hover:border-gray-700 transition-all text-left"
            >
              {member.profilePicture ? (
                <img
                  src={member.profilePicture}
                  alt={`${member.firstname} ${member.lastname}`}
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {member.firstname} {member.lastname}
                </p>
                {member.username && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                    @{member.username}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Member profile modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg w-full max-w-sm p-6 relative">
            <button
              type="button"
              onClick={() => setSelectedMember(null)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center text-center">
              {selectedMember.profilePicture ? (
                <img
                  src={selectedMember.profilePicture}
                  alt={`${selectedMember.firstname} ${selectedMember.lastname}`}
                  className="w-20 h-20 rounded-full object-cover mb-3"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-3">
                  <User className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                </div>
              )}
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {selectedMember.firstname} {selectedMember.lastname}
              </h2>
              {selectedMember.username && (
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
                  @{selectedMember.username}
                </p>
              )}
              {selectedMember.memberSince && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Member since{" "}
                  {new Date(selectedMember.memberSince).toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<Tab>("feed");

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "feed", label: "Feed", icon: Rss },
    { id: "members", label: "Members", icon: Users },
  ];

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Community</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          Connect with fellow members, share updates, and celebrate milestones.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "feed" ? <CommunityFeed /> : <MembersTab />}
    </DashboardLayout>
  );
}
