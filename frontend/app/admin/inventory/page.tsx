"use client";

import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useGetInventory } from "@/lib/react-query/hooks/admin/inventory/useGetInventory";
import { useCreateInventoryItem } from "@/lib/react-query/hooks/admin/inventory/useCreateInventoryItem";
import { Plus, X, Package } from "lucide-react";

const CONDITIONS = ["GOOD", "FAIR", "NEEDS_REPAIR", "RETIRED"];

const conditionBadge: Record<string, string> = {
  GOOD: "bg-green-100 text-green-700",
  FAIR: "bg-yellow-100 text-yellow-700",
  NEEDS_REPAIR: "bg-red-100 text-red-700",
  RETIRED: "bg-gray-100 text-gray-500",
};

const emptyForm = { name: "", category: "", serialNumber: "", location: "", condition: "GOOD", notes: "" };

export default function AdminInventoryPage() {
  const [filters, setFilters] = useState<{ category?: string; condition?: string }>({});
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useGetInventory(filters);
  const createItem = useCreateInventoryItem();
  const items = (data as any)?.data ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createItem.mutateAsync({ ...form, serialNumber: form.serialNumber || undefined });
    setShowModal(false);
    setForm(emptyForm);
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500 text-sm mt-1">Track hub assets and assignments.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <input
          placeholder="Filter by category..."
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value || undefined }))}
        />
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          onChange={(e) => setFilters((f) => ({ ...f, condition: e.target.value || undefined }))}
        >
          <option value="">All conditions</option>
          {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No inventory items found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Name", "Category", "Serial No.", "Location", "Condition", "Assigned To"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                  <td className="px-4 py-3 text-gray-500">{item.category}</td>
                  <td className="px-4 py-3 text-gray-400">{item.serialNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{item.location}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${conditionBadge[item.condition]}`}>
                      {item.condition.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {item.assignedTo ? `${item.assignedTo.firstname} ${item.assignedTo.lastname}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-semibold text-gray-900">Add Inventory Item</h2>
              <button onClick={() => setShowModal(false)}><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              {[
                { label: "Name", key: "name", required: true },
                { label: "Category", key: "category", required: true },
                { label: "Serial Number", key: "serialNumber", required: false },
                { label: "Location", key: "location", required: true },
              ].map(({ label, key, required }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    value={(form as any)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    required={required}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                <select
                  value={form.condition}
                  onChange={(e) => setForm({ ...form, condition: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={createItem.isPending} className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50">
                  {createItem.isPending ? "Adding..." : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
