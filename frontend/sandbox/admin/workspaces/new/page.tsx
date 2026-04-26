"use client";

import { useState } from "react";

const TYPES = ["Hot Desk", "Private Office", "Meeting Room", "Event Space"];
const AMENITIES = ["WiFi", "Projector", "Whiteboard", "Coffee", "Parking", "AC", "Locker"];

interface FormData {
  name: string; type: string; seats: number; rate: number;
  description: string; amenities: string[]; active: boolean;
}

const defaults: FormData = { name: "", type: "", seats: 1, rate: 0, description: "", amenities: [], active: true };

export default function NewWorkspacePage({ initial }: { initial?: Partial<FormData> }) {
  const [form, setForm] = useState<FormData>({ ...defaults, ...initial });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  const set = (k: keyof FormData, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const toggleAmenity = (a: string) =>
    set("amenities", form.amenities.includes(a) ? form.amenities.filter((x) => x !== a) : [...form.amenities, a]);

  const validate = () => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.type) e.type = "Type is required";
    if (form.seats < 1) e.seats = "Must be at least 1";
    if (form.rate <= 0) e.rate = "Must be greater than 0";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800)); // mock API
    setSubmitting(false);
    setToast(initial ? "Workspace updated!" : "Workspace created!");
    setTimeout(() => setToast(""), 3000);
  };

  const field = "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200";
  const err = (k: keyof FormData) => errors[k] && <p className="text-red-500 text-xs mt-1">{errors[k]}</p>;

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <h1 className="text-xl font-bold text-gray-900 mb-6">{initial ? "Edit Workspace" : "New Workspace"}</h1>

      {toast && <div className="mb-4 px-4 py-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg">{toast}</div>}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl border border-gray-100 p-6">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Name</label>
          <input className={field} value={form.name} onChange={(e) => set("name", e.target.value)} />
          {err("name")}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Type</label>
          <select className={field} value={form.type} onChange={(e) => set("type", e.target.value)}>
            <option value="">Select type</option>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          {err("type")}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Total Seats</label>
            <input type="number" className={field} value={form.seats} onChange={(e) => set("seats", +e.target.value)} />
            {err("seats")}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Hourly Rate (₦)</label>
            <input type="number" className={field} value={form.rate} onChange={(e) => set("rate", +e.target.value)} />
            {err("rate")}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Description</label>
          <textarea className={`${field} resize-none`} rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">Amenities</label>
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map((a) => (
              <button key={a} type="button" onClick={() => toggleAmenity(a)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${form.amenities.includes(a) ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}>
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-gray-700">Active</span>
          <button type="button" role="switch" aria-checked={form.active} onClick={() => set("active", !form.active)}
            className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${form.active ? "bg-gray-900" : "bg-gray-200"}`}>
            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${form.active ? "translate-x-[22px]" : "translate-x-0.5"}`} />
          </button>
        </div>

        <button type="submit" disabled={submitting}
          className="w-full py-2.5 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 transition-colors">
          {submitting ? "Saving..." : initial ? "Save changes" : "Create workspace"}
        </button>
      </form>
    </div>
  );
}
