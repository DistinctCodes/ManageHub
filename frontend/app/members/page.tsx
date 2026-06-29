"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { apiClient } from "@/lib/apiClient";
import { Search, User, X, Linkedin, Twitter } from "lucide-react";

type Member = {
  id: string;
  firstName: string;
  lastName: string;
  bio: string;
  skills: string[];
  avatarUrl?: string;
  isPublicProfile: boolean;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
  };
};

export default function MembersDirectoryPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [skillsFilter, setSkillsFilter] = useState<string[]>([]);
  const [allSkills, setAllSkills] = useState<string[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  useEffect(() => {
    fetchMembers();
  }, [search, skillsFilter]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<{ data: Member[] }>(`/users/directory?search=${search}`);
      let data = res.data || [];
      if (skillsFilter.length > 0) {
        data = data.filter(member => member.skills?.some(skill => skillsFilter.includes(skill)));
      }
      setMembers(data);

      if (allSkills.length === 0) {
        const skillsSet = new Set<string>();
        data.forEach(m => m.skills?.forEach(s => skillsSet.add(s)));
        setAllSkills(Array.from(skillsSet));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSkill = (skill: string) => {
    setSkillsFilter(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Member Directory</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          Discover and connect with other members in the hub.
        </p>
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-lg text-sm">
          Opt-in notice: Only members who have set their profile to public appear here. You can change this in your profile settings.
        </div>
      </div>

      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or bio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      {allSkills.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {allSkills.map(skill => (
            <button
              key={skill}
              onClick={() => toggleSkill(skill)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                skillsFilter.includes(skill)
                  ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {skill}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {[...Array(6)].map((_, i) => (
             <div key={i} className="h-48 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl animate-pulse" />
           ))}
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p>No members found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map(member => (
            <div 
              key={member.id} 
              onClick={() => setSelectedMember(member)}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-6 flex flex-col cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4 mb-4">
                {member.avatarUrl ? (
                  <img src={member.avatarUrl} alt={`${member.firstName} ${member.lastName}`} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {member.firstName} {member.lastName}
                  </h3>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex-1 line-clamp-3 overflow-hidden text-ellipsis">
                {member.bio ? member.bio.slice(0, 100) + (member.bio.length > 100 ? "..." : "") : "No bio provided."}
              </p>
              <div className="flex flex-wrap gap-2 mt-auto">
                {member.skills?.slice(0, 3).map(skill => (
                  <span key={skill} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded text-xs font-medium">
                    {skill}
                  </span>
                ))}
                {member.skills && member.skills.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded text-xs font-medium">
                    +{member.skills.length - 3}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg w-full max-w-lg p-6 relative">
            <button
              onClick={() => setSelectedMember(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center text-center mb-6">
              {selectedMember.avatarUrl ? (
                <img src={selectedMember.avatarUrl} alt={`${selectedMember.firstName} ${selectedMember.lastName}`} className="w-24 h-24 rounded-full object-cover mb-4" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <User className="w-12 h-12 text-gray-500 dark:text-gray-400" />
                </div>
              )}
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {selectedMember.firstName} {selectedMember.lastName}
              </h2>
              <div className="flex items-center gap-3 mt-3">
                {selectedMember.socialLinks?.linkedin && (
                  <a href={selectedMember.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-600 transition-colors">
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
                {selectedMember.socialLinks?.twitter && (
                  <a href={selectedMember.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-400 transition-colors">
                    <Twitter className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">About</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {selectedMember.bio || "No bio provided."}
                </p>
              </div>
              
              {selectedMember.skills && selectedMember.skills.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMember.skills.map(skill => (
                      <span key={skill} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded text-xs font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
