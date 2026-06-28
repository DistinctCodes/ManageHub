"use client";

import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useGetEmailCampaigns } from "@/lib/react-query/hooks/admin/campaigns/useGetEmailCampaigns";
import { useCreateEmailCampaign } from "@/lib/react-query/hooks/admin/campaigns/useCreateEmailCampaign";
import { useSendEmailCampaign } from "@/lib/react-query/hooks/admin/campaigns/useSendEmailCampaign";
import { Mail, Plus, X, Send } from "lucide-react";

const SEGMENTS = ["ALL", "ACTIVE", "INACTIVE", "STAFF"];

const statusBadge: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  SCHEDULED: "bg-blue-100 text-blue-700",
  SENDING: "bg-yellow-100 text-yellow-700",
  SENT: "bg-green-100 text-green-700",
};

const emptyForm = { subject: "", bodyHtml: "", targetSegment: "ALL" };

export default function AdminCampaignsPage() {
  const [showComposer, setShowComposer] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useGetEmailCampaigns();
  const createCampaign = useCreateEmailCampaign();
  const sendCampaign = useSendEmailCampaign();
  const campaigns = (data as any)?.data ?? [];

  const handleSaveDraft = async () => {
    await createCampaign.mutateAsync(form);
    setShowComposer(false);
    setForm(emptyForm);
  };

  const handleSendNow = async (id: string) => {
    await sendCampaign.mutateAsync(id);
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Campaigns</h1>
          <p className="text-gray-500 text-sm mt-1">Create and send targeted email campaigns to member segments.</p>
        </div>
        <button
          onClick={() => setShowComposer(true)}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800"
        >
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Mail className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No campaigns yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y">
          {campaigns.map((c: any) => (
            <div key={c.id} className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{c.subject}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{c.targetSegment}</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusBadge[c.status]}`}>{c.status}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                {c.status === "DRAFT" && (
                  <button
                    onClick={() => handleSendNow(c.id)}
                    disabled={sendCampaign.isPending}
                    className="flex items-center gap-1 text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-50"
                  >
                    <Send className="w-3 h-3" /> Send
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showComposer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white">
              <h2 className="font-semibold text-gray-900">New Campaign</h2>
              <button onClick={() => setShowComposer(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Campaign subject..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Audience Segment</label>
                <select
                  value={form.targetSegment}
                  onChange={(e) => setForm({ ...form, targetSegment: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  {SEGMENTS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                <textarea
                  value={form.bodyHtml}
                  onChange={(e) => setForm({ ...form, bodyHtml: e.target.value })}
                  rows={8}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono resize-y"
                  placeholder="Campaign body (HTML or plain text)..."
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowComposer(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="button" onClick={handleSaveDraft} disabled={createCampaign.isPending} className="px-4 py-2 text-sm border border-gray-900 text-gray-900 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                  Save Draft
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
