"use client";
import { useState, useEffect } from "react";
import { Users, TrendingUp, CalendarCheck, Award, Crown, Trophy, Medal, Star } from "lucide-react";

interface Member {
  id: string;
  name: string;
  avatar: string;
  activityScore: number;
  streak: number;
  totalBookings: number;
  isCurrentUser: boolean;
}

const mockMembers: Member[] = [
  { id: "1", name: "Alex Morgan", avatar: "https://i.pravatar.cc/150?u=1", activityScore: 9850, streak: 47, totalBookings: 128, isCurrentUser: true },
  { id: "2", name: "Jordan Lee", avatar: "https://i.pravatar.cc/150?u=2", activityScore: 9240, streak: 35, totalBookings: 98, isCurrentUser: false },
  { id: "3", name: "Taylor Kim", avatar: "https://i.pravatar.cc/150?u=3", activityScore: 8920, streak: 52, totalBookings: 145, isCurrentUser: false },
  { id: "4", name: "Morgan Chen", avatar: "https://i.pravatar.cc/150?u=4", activityScore: 8350, streak: 28, totalBookings: 87, isCurrentUser: false },
  { id: "5", name: "Riley Smith", avatar: "https://i.pravatar.cc/150?u=5", activityScore: 7890, streak: 19, totalBookings: 76, isCurrentUser: false },
  { id: "6", name: "Casey Jones", avatar: "https://i.pravatar.cc/150?u=6", activityScore: 7420, streak: 41, totalBookings: 102, isCurrentUser: false },
  { id: "7", name: "Drew Wilson", avatar: "https://i.pravatar.cc/150?u=7", activityScore: 6980, streak: 15, totalBookings: 65, isCurrentUser: false },
  { id: "8", name: "Quinn Brown", avatar: "https://i.pravatar.cc/150?u=8", activityScore: 6540, streak: 22, totalBookings: 54, isCurrentUser: false },
  { id: "9", name: "Avery Davis", avatar: "https://i.pravatar.cc/150?u=9", activityScore: 6100, streak: 8, totalBookings: 43, isCurrentUser: false },
  { id: "10", name: "Parker Evans", avatar: "https://i.pravatar.cc/150?u=10", activityScore: 5670, streak: 31, totalBookings: 61, isCurrentUser: false },
  { id: "11", name: "Hayden Clark", avatar: "https://i.pravatar.cc/150?u=11", activityScore: 5230, streak: 12, totalBookings: 38, isCurrentUser: false },
  { id: "12", name: "Reese Lewis", avatar: "https://i.pravatar.cc/150?u=12", activityScore: 4890, streak: 7, totalBookings: 29, isCurrentUser: false },
];

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<"activity" | "streak" | "bookings">("activity");
  const [timeRange, setTimeRange] = useState<"month" | "all">("month");
  const [isLoading, setIsLoading] = useState(true);
  const [sortedMembers, setSortedMembers] = useState<Member[]>([]);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      let sorted = [...mockMembers];
      if (timeRange === "month") {
        sorted = sorted.map(m => ({
          ...m,
          activityScore: Math.round(m.activityScore * 0.4),
          streak: Math.min(m.streak, 7),
          totalBookings: Math.round(m.totalBookings * 0.35),
        }));
      }
      sorted.sort((a, b) => {
        if (activeTab === "activity") return b.activityScore - a.activityScore;
        if (activeTab === "streak") return b.streak - a.streak;
        return b.totalBookings - a.totalBookings;
      });
      setSortedMembers(sorted);
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [activeTab, timeRange]);

  const getScore = (member: Member) => {
    if (activeTab === "activity") return member.activityScore;
    if (activeTab === "streak") return member.streak;
    return member.totalBookings;
  };

  const getScoreLabel = () => {
    if (activeTab === "activity") return "Activity Score";
    if (activeTab === "streak") return "Check-in Streak";
    return "Total Bookings";
  };

  const getScoreUnit = () => {
    if (activeTab === "streak") return " days";
    return "";
  };

  const getCurrentUserRank = () => {
    const idx = sortedMembers.findIndex((m) => m.isCurrentUser);
    return idx !== -1 ? idx + 1 : null;
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Award className="w-8 h-8 text-yellow-500" />
          Member Leaderboard
        </h1>
        <p className="text-gray-600">See how members rank by activity, consistency, and engagement</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setActiveTab("activity")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "activity"
              ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            <TrendingUp className="w-4 h-4" />
            Activity Score
          </button>
          <button
            onClick={() => setActiveTab("streak")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "streak"
              ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            <CalendarCheck className="w-4 h-4" />
            Streak
          </button>
          <button
            onClick={() => setActiveTab("bookings")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "bookings"
              ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            <Users className="w-4 h-4" />
            Total Bookings
          </button>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 ml-auto">
          <button
            onClick={() => setTimeRange("month")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${timeRange === "month"
              ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            This Month
          </button>
          <button
            onClick={() => setTimeRange("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${timeRange === "all"
              ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            All Time
          </button>
        </div>
      </div>

      {sortedMembers.length > 0 && !isLoading && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Star className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Your Current Rank</p>
              <p className="text-lg font-bold text-gray-900">
                #{getCurrentUserRank()} of {sortedMembers.length} members
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Activity Score</p>
            <p className="text-lg font-bold text-blue-600">
              {sortedMembers.find((m) => m.isCurrentUser)?.activityScore?.toLocaleString() || 0}
            </p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-200 animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                  </div>
                  <div className="w-16 h-8 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!isLoading && sortedMembers.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 0, 2].map((idx) => {
            const member = sortedMembers[idx];
            const rank = getRankLabel(idx);
            const Icon = rank?.Icon || Star;
            if (!member || !rank) return null;
            return (
              <div
                key={member.id}
                className={`relative bg-gradient-to-br ${rank.color} rounded-2xl p-5 shadow-lg transform transition-all hover:scale-105 ${
                  member.isCurrentUser ? "ring-2 ring-offset-2 ring-yellow-400" : ""
                }`}
              >
                <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full flex items-center justify-center bg-white shadow-md">
                  <Icon className="w-6 h-6 text-yellow-500" />
                </div>
                <div className="flex flex-col items-center text-center pt-2">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-16 h-16 rounded-full border-4 border-white/50 object-cover mb-3"
                  />
                  <span className="text-white/80 text-sm mb-1">{rank.label}</span>
                  <h3 className="text-white font-bold text-lg truncate">{member.name}</h3>
                  {member.isCurrentUser && (
                    <span className="text-xs text-white/70 mt-1 px-2 py-0.5 bg-white/20 rounded-full">
                      You
                    </span>
                  )}
                  <div className="mt-3">
                    <span className="text-white/90 text-sm">{getScoreLabel()}</span>
                    <p className="text-2xl font-bold text-white">
                      {getScore(member).toLocaleString()}
                      <span className="text-sm font-normal text-white/70 ml-1">{getScoreUnit()}</span>
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && sortedMembers.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-semibold text-gray-800">Rankings</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {sortedMembers.slice(3).map((member, index) => {
              const actualRank = index + 4;
              return (
                <div
                  key={member.id}
                  className={`flex items-center gap-4 px-6 py-4 transition-colors ${
                    member.isCurrentUser
                      ? "bg-blue-50 border-l-4 border-blue-400"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500">
                    {actualRank}
                  </span>
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{member.name}</p>
                    {member.isCurrentUser && (
                      <span className="text-xs text-blue-600 font-medium">You</span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      {getScore(member).toLocaleString()}
                      <span className="text-xs text-gray-400 ml-1">{getScoreUnit()}</span>
                    </p>
                    <p className="text-xs text-gray-400">{getScoreLabel()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!isLoading && sortedMembers.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No members found</p>
        </div>
      )}
    </div>
  );
}

function getRankLabel(idx: number) {
  if (idx === 0) return { label: "1st", Icon: Crown, color: "from-yellow-400 to-yellow-600", bg: "bg-yellow-50", text: "text-yellow-600", border: "border-yellow-200" };
  if (idx === 1) return { label: "2nd", Icon: Medal, color: "from-gray-300 to-gray-500", bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" };
  if (idx === 2) return { label: "3rd", Icon: Trophy, color: "from-amber-600 to-amber-800", bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" };
  return null;
}
