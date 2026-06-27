"use client";

import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useGetAnnouncements } from "@/lib/react-query/hooks/admin/announcements/useGetAnnouncements";
import { useSendAnnouncement } from "@/lib/react-query/hooks/admin/announcements/useSendAnnouncement";
import { Megaphone, Plus, X } from "lucide-react";

const AUDIENCES = ["ALL_MEMBERS", "ACTIVE_MEMBERS", "STAFF"];
const CHANNELS = ["IN_APP", "EMAIL", "BOTH"];

export default function AdminAnnouncementsPage() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", audience: "ALL_MEMBERS", channel: "IN_APP" });

  const { data, isLoading } = useGetAnnouncements();
  const send = useSendAnnouncement();
  const announcements = (data as any)?.items ?? (data as any)?.data ?? [];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    await send.mutateAsync({ title: form.title, content: form.content });
    setShowModal(false);
    setForm({ title: "", content: "", audience: "ALL_MEMBERS", channel: "IN_APP" });
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-500 text-sm mt-1">Broadcast messages to member segments.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800"
        >
          <Plus className="w-4 h-4" /> New Announcement
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (Array.isArray(announcements) ? announcements : []).length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No announcements yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y">
          {(Array.isArray(announcements) ? announcements : []).map((ann: any) => (
            <div key={ann.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-900">{ann.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{ann.content}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{new Date(ann.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-semibold text-gray-900">New Announcement</h2>
              <button onClick={() => setShowModal(false)}><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSend} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
                <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {AUDIENCES.map((a) => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
                <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {CHANNELS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required rows={4} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg">Cancel</button>
                <button type="submit" disabled={send.isPending} className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg disabled:opacity-50">
                  {send.isPending ? "Sending..." : "Send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
