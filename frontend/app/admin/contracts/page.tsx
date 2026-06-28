"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Send, XCircle } from "lucide-react";
import api from "@/lib/axios";

type Contract = {
  id: string;
  memberId: string;
  title: string;
  status: string;
  sentAt?: string;
  signedAt?: string;
  expiresAt?: string;
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-amber-100 text-amber-700",
  signed: "bg-green-100 text-green-700",
  expired: "bg-red-100 text-red-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function AdminContractsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    memberId: "",
    title: "",
    bodyHtml: "",
    expiresAt: "",
  });

  const { data = [] } = useQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      const r = await api.get("/contracts");
      return r.data.data as Contract[];
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) => api.post("/contracts", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      setShowModal(false);
      setForm({ memberId: "", title: "", bodyHtml: "", expiresAt: "" });
    },
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/contracts/${id}/send`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contracts"] }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/contracts/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contracts"] }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Digital Contracts</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <Plus size={16} /> New Contract
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Title", "Member ID", "Status", "Sent", "Signed", "Actions"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No contracts yet
                </td>
              </tr>
            ) : (
              data.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.title}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {c.memberId.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {c.sentAt ? new Date(c.sentAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {c.signedAt ? new Date(c.signedAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {c.status === "draft" && (
                        <button
                          onClick={() => sendMutation.mutate(c.id)}
                          className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs"
                        >
                          <Send size={12} /> Send
                        </button>
                      )}
                      {["draft", "sent"].includes(c.status) && (
                        <button
                          onClick={() => {
                            if (confirm("Cancel this contract?")) cancelMutation.mutate(c.id);
                          }}
                          className="flex items-center gap-1 text-red-400 hover:text-red-600 text-xs"
                        >
                          <XCircle size={12} /> Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl space-y-4">
            <h2 className="text-lg font-semibold">New Contract</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Member ID *</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="UUID of the member"
                value={form.memberId}
                onChange={(e) => setForm((f) => ({ ...f, memberId: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contract Body (HTML)</label>
              <textarea
                rows={6}
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                value={form.bodyHtml}
                onChange={(e) => setForm((f) => ({ ...f, bodyHtml: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Expires At</label>
              <input
                type="date"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border rounded-lg px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  createMutation.mutate({
                    ...form,
                    expiresAt: form.expiresAt
                      ? new Date(form.expiresAt).toISOString()
                      : "",
                  })
                }
                disabled={!form.memberId || !form.title || createMutation.isPending}
                className="flex-1 bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
              >
                {createMutation.isPending ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
