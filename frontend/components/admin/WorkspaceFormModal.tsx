"use client";

import { useState, useEffect } from "react";
import { X, Building2 } from "lucide-react";
import { Workspace, WorkspaceType } from "@/lib/types/workspace";
import { useCreateWorkspace } from "@/lib/react-query/hooks/admin/workspaces/useCreateWorkspace";
import { useUpdateWorkspace } from "@/lib/react-query/hooks/admin/workspaces/useUpdateWorkspace";

const WORKSPACE_TYPES: WorkspaceType[] = [
  "COWORKING",
  "PRIVATE_OFFICE",
  "MEETING_ROOM",
  "HOT_DESK",
  "DEDICATED_DESK",
];

const TYPE_LABELS: Record<WorkspaceType, string> = {
  COWORKING: "Coworking",
  PRIVATE_OFFICE: "Private Office",
  MEETING_ROOM: "Meeting Room",
  HOT_DESK: "Hot Desk",
  DEDICATED_DESK: "Dedicated Desk",
};

interface Props {
  workspace?: Workspace; // undefined = create mode
  onClose: () => void;
}

export default function WorkspaceFormModal({ workspace, onClose }: Props) {
  const isEdit = !!workspace;
  const create = useCreateWorkspace();
  const update = useUpdateWorkspace();

  const [name, setName] = useState(workspace?.name ?? "");
  const [type, setType] = useState<WorkspaceType>(
    workspace?.type ?? "COWORKING"
  );
  const [totalSeats, setTotalSeats] = useState(
    workspace?.totalSeats?.toString() ?? "1"
  );
  const [hourlyRateNaira, setHourlyRateNaira] = useState(
    workspace ? String(workspace.hourlyRate / 100) : ""
  );
  const [description, setDescription] = useState(
    workspace?.description ?? ""
  );
  const [amenitiesInput, setAmenitiesInput] = useState(
    workspace?.amenities?.join(", ") ?? ""
  );
  const [error, setError] = useState("");

  const isPending = create.isPending || update.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const seats = parseInt(totalSeats, 10);
    const rateNaira = parseFloat(hourlyRateNaira);

    if (!name.trim()) return setError("Name is required");
    if (isNaN(seats) || seats < 1) return setError("Seats must be at least 1");
    if (isNaN(rateNaira) || rateNaira <= 0)
      return setError("Hourly rate must be greater than 0");

    const amenities = amenitiesInput
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    const dto = {
      name: name.trim(),
      type,
      totalSeats: seats,
      hourlyRate: Math.round(rateNaira * 100), // naira → kobo
      description: description.trim() || undefined,
      amenities: amenities.length ? amenities : undefined,
    };

    try {
      if (isEdit) {
        await update.mutateAsync({ id: workspace.id, dto });
      } else {
        await create.mutateAsync(dto);
      }
      onClose();
    } catch {
      // error already toasted
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-600" />
            <h2 className="text-sm font-semibold text-gray-900">
              {isEdit ? "Edit workspace" : "New workspace"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. The Hive — Floor 2"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>

          {/* Type + Seats row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Type <span className="text-red-400">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as WorkspaceType)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                {WORKSPACE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Total seats <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min={1}
                value={totalSeats}
                onChange={(e) => setTotalSeats(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>
          </div>

          {/* Hourly rate */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Hourly rate (₦) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                ₦
              </span>
              <input
                type="number"
                min={1}
                step="0.01"
                value={hourlyRateNaira}
                onChange={(e) => setHourlyRateNaira(e.target.value)}
                placeholder="5000"
                className="w-full pl-8 pr-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe the space..."
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 resize-none"
            />
          </div>

          {/* Amenities */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Amenities{" "}
              <span className="text-gray-400">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={amenitiesInput}
              onChange={(e) => setAmenitiesInput(e.target.value)}
              placeholder="WiFi, AC, Standing desk, Printer"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-5 py-2.5 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {isPending
                ? isEdit
                  ? "Saving..."
                  : "Creating..."
                : isEdit
                ? "Save changes"
                : "Create workspace"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
