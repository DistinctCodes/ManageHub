"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { apiClient } from "@/lib/apiClient";
import { Copy, Share2, Users, CheckCircle, Wallet, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type ReferralStats = {
  totalReferrals: number;
  successfulConversions: number;
  totalRewards: number;
  history: Array<{
    id: string;
    referredName: string | null;
    status: "PENDING" | "COMPLETED";
    rewardEarned: number;
    createdAt: string;
  }>;
};

export default function ReferralsPage() {
  const [referralCode, setReferralCode] = useState<string>("");
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      const [codeRes, statsRes] = await Promise.all([
        apiClient.get<{ data: { code: string } }>("/referrals/my-code").catch(() => null),
        apiClient.get<{ data: ReferralStats }>("/referrals/stats").catch(() => null)
      ]);
      
      if (codeRes?.data) setReferralCode(codeRes.data.code);
      if (statsRes?.data) setStats(statsRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const referralLink = typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${referralCode}` : `https://managehub.vercel.app/register?ref=${referralCode}`;

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    toast.success(message);
  };

  const shareWhatsApp = () => {
    const text = `Join me on ManageHub using my referral link: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareTwitter = () => {
    const text = `Join me on ManageHub using my referral link:`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}`, '_blank');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="mb-8">
          <div className="w-48 h-8 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-2" />
          <div className="w-64 h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-white dark:bg-gray-900 rounded-xl animate-pulse" />)}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Referral Program</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          Invite friends to ManageHub and earn rewards.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-6 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Referrals</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats?.totalReferrals || 0}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-6 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Successful Conversions</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats?.successfulConversions || 0}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-6 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="w-5 h-5 text-purple-500" />
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Rewards</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            ₦{((stats?.totalRewards || 0) / 100).toLocaleString('en-NG')}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Your Referral Code</h2>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex-1">
            <span className="font-mono text-lg font-bold text-gray-900 dark:text-gray-100 flex-1">{referralCode || "Loading..."}</span>
            <button 
              onClick={() => copyToClipboard(referralCode, "Referral code copied!")}
              className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              title="Copy Code"
            >
              <Copy className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => copyToClipboard(referralLink, "Referral link copied!")}
              className="flex items-center gap-2 px-4 py-3 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Copy Link
            </button>
            <button 
              onClick={shareWhatsApp}
              className="flex items-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
            >
              WhatsApp
            </button>
            <button 
              onClick={shareTwitter}
              className="flex items-center gap-2 px-4 py-3 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors"
            >
              X / Twitter
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Referral History</h2>
        </div>
        
        {(!stats?.history || stats.history.length === 0) ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>You haven't referred anyone yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Referred Person</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Reward Earned</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {stats.history.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                      {item.referredName || "Pending User"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        item.status === 'COMPLETED' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                      ₦{(item.rewardEarned / 100).toLocaleString('en-NG')}
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
