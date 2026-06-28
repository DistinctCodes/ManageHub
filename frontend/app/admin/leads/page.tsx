"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, UserCheck, Trash2, ChevronDown } from "lucide-react";
import api from "@/lib/axios";

type Lead = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  source: string;
  status: string;
  notes?: string;
  assignedToStaffId?: string;
  convertedAt?: string;
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-amber-100 text-amber-700",
  qualified: "bg-indigo-100 text-indigo-700",
  converted: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
};

const SOURCES = ["CONTACT_FORM", "REFERRAL", "WALK_IN", "OTHER"];
const STATUSES = ["new", "contacted", "qualified", "converted", "lost"];

export default function AdminLeadsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    source: "CONTACT_FORM",
    notes: "",
  });

  const { data = [] } = useQuery({
    queryKey: ["leads", statusFilter],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      const r = await api.get("/leads", { params });
      return r.data.data as Lead[];
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) => api.post("/leads", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      setShowModal(false);
      setForm({ name: "", email: "", phone: "", company: "", source: "CONTACT_FORM", notes: "" });
    },
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => api.post(`/leads/${id}/convert`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/leads/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/leads/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leads / CRM</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <Plus size={16} /> Add Lead
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter("")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
            !statusFilter ? "bg-gray-900 text-white border-gray-900" : "border-gray-300 text-gray-600"
          }`}
        >
          All
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border capitalize ${
              statusFilter === s
                ? "bg-gray-900 text-white border-gray-900"
                : "border-gray-300 text-gray-600"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Name", "Email", "Company", "Source", "Status", "Actions"].map((h) => (
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
                  No leads found
                </td>
              </tr>
            ) : (
              data.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{lead.name}</td>
                  <td className="px-4 py-3 text-gray-500">{lead.email}</td>
                  <td className="px-4 py-3 text-gray-500">{lead.company ?? "—"}</td>
                  <td className="px-4 py-3 capitalize">{lead.source.replace("_", " ").toLowerCase()}</td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.status}
                      onChange={(e) =>
                        updateStatus.mutate({ id: lead.id, status: e.target.value })
                      }
                      className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_COLORS[lead.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s} className="bg-white text-gray-900">
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {lead.status !== "converted" && (
                        <button
                          onClick={() => convertMutation.mutate(lead.id)}
                          className="text-green-600 hover:text-green-800 text-xs flex items-center gap-1"
                          title="Convert to member"
                        >
                          <UserCheck size={14} /> Convert
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm("Delete this lead?")) deleteMutation.mutate(lead.id);
                        }}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
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
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h2 className="text-lg font-semibold">Add Lead</h2>
            {[
              { label: "Name *", key: "name" },
              { label: "Email *", key: "email" },
              { label: "Phone", key: "phone" },
              { label: "Company", key: "company" },
              { label: "Notes", key: "notes" },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={(form as any)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium mb-1">Source</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border rounded-lg px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={!form.name || !form.email || createMutation.isPending}
                className="flex-1 bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
              >
                {createMutation.isPending ? "Saving…" : "Add Lead"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
