"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Zap, Trash2 } from "lucide-react";
import api from "@/lib/axios";

type Zone = {
  id?: string;
  workspaceId?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  color?: string;
};

type FloorPlan = {
  id: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  isActive: boolean;
  zones: Zone[];
};

const CANVAS_W = 900;
const CANVAS_H = 600;

export default function FacilitiesEditorPage() {
  const qc = useQueryClient();
  const svgRef = useRef<SVGSVGElement>(null);

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [drawing, setDrawing] = useState<{ x: number; y: number } | null>(null);
  const [current, setCurrent] = useState<Zone | null>(null);
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");

  const { data: plans = [] } = useQuery({
    queryKey: ["floor-plans"],
    queryFn: async () => {
      const r = await api.get("/floor-plan");
      return r.data.data as FloorPlan[];
    },
  });

  const createPlanMutation = useMutation({
    mutationFn: (name: string) =>
      api.post("/floor-plan", { name, canvasWidth: CANVAS_W, canvasHeight: CANVAS_H }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["floor-plans"] });
      setSelectedPlanId(r.data.data.id);
      setZones([]);
      setShowNewPlan(false);
      setNewPlanName("");
    },
  });

  const saveZonesMutation = useMutation({
    mutationFn: (id: string) =>
      api.put(`/floor-plan/${id}/zones`, { zones }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["floor-plans"] }),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/floor-plan/${id}/activate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["floor-plans"] }),
  });

  const loadPlan = (plan: FloorPlan) => {
    setSelectedPlanId(plan.id);
    setZones(plan.zones ?? []);
  };

  const getSvgCoords = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: Math.round(((e.clientX - rect.left) / rect.width) * CANVAS_W),
      y: Math.round(((e.clientY - rect.top) / rect.height) * CANVAS_H),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target !== svgRef.current) return;
    const pt = getSvgCoords(e);
    setDrawing(pt);
    setCurrent({ ...pt, width: 0, height: 0, color: "#6366f1", label: "Zone" });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!drawing || !current) return;
    const pt = getSvgCoords(e);
    setCurrent({
      ...current,
      width: Math.max(0, pt.x - drawing.x),
      height: Math.max(0, pt.y - drawing.y),
    });
  };

  const handleMouseUp = () => {
    if (current && current.width > 10 && current.height > 10) {
      setZones((z) => [...z, current]);
    }
    setDrawing(null);
    setCurrent(null);
  };

  const updateZoneLabel = (idx: number, label: string) => {
    setZones((z) => z.map((zone, i) => (i === idx ? { ...zone, label } : zone)));
  };

  const removeZone = (idx: number) => {
    setZones((z) => z.filter((_, i) => i !== idx));
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Floor Plan Editor</h1>
        <button
          onClick={() => setShowNewPlan(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <Plus size={16} /> New Floor Plan
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {plans.map((p) => (
          <button
            key={p.id}
            onClick={() => loadPlan(p)}
            className={`px-3 py-1.5 rounded-lg text-sm border font-medium ${
              selectedPlanId === p.id
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400"
            }`}
          >
            {p.name} {p.isActive && <span className="ml-1 text-xs">✓ active</span>}
          </button>
        ))}
      </div>

      {selectedPlanId ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Draw zones by clicking and dragging on the canvas below.
          </p>

          <div className="border border-gray-300 rounded-xl overflow-hidden bg-gray-50">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
              className="w-full"
              style={{ cursor: "crosshair", userSelect: "none" }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              {zones.map((z, i) => (
                <g key={i}>
                  <rect
                    x={z.x}
                    y={z.y}
                    width={z.width}
                    height={z.height}
                    fill={z.color ?? "#6366f1"}
                    fillOpacity={0.25}
                    stroke={z.color ?? "#6366f1"}
                    strokeWidth={2}
                    rx={4}
                  />
                  <text
                    x={z.x + z.width / 2}
                    y={z.y + z.height / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={12}
                    fill={z.color ?? "#6366f1"}
                    fontWeight="600"
                    style={{ pointerEvents: "none" }}
                  >
                    {z.label ?? "Zone"}
                  </text>
                </g>
              ))}
              {current && (
                <rect
                  x={current.x}
                  y={current.y}
                  width={current.width}
                  height={current.height}
                  fill="#6366f1"
                  fillOpacity={0.2}
                  stroke="#6366f1"
                  strokeWidth={2}
                  strokeDasharray="4"
                  rx={4}
                />
              )}
            </svg>
          </div>

          {zones.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Zones</h3>
              {zones.map((z, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className="border rounded px-2 py-1 text-sm flex-1"
                    value={z.label ?? ""}
                    onChange={(e) => updateZoneLabel(i, e.target.value)}
                    placeholder="Zone label"
                  />
                  <span className="text-xs text-gray-400">
                    {z.width}×{z.height} @ ({z.x},{z.y})
                  </span>
                  <button
                    onClick={() => removeZone(i)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => saveZonesMutation.mutate(selectedPlanId)}
              disabled={saveZonesMutation.isPending}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
            >
              <Save size={16} />
              {saveZonesMutation.isPending ? "Saving…" : "Save Zones"}
            </button>
            {selectedPlan && !selectedPlan.isActive && (
              <button
                onClick={() => activateMutation.mutate(selectedPlanId)}
                disabled={activateMutation.isPending}
                className="flex items-center gap-2 border border-green-600 text-green-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-50 disabled:opacity-60"
              >
                <Zap size={16} />
                {activateMutation.isPending ? "Activating…" : "Set as Active"}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          Select a floor plan or create a new one to start editing.
        </div>
      )}

      {showNewPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h2 className="text-lg font-semibold">New Floor Plan</h2>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Plan name (e.g. Ground Floor)"
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowNewPlan(false)}
                className="flex-1 border rounded-lg px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => createPlanMutation.mutate(newPlanName)}
                disabled={!newPlanName.trim() || createPlanMutation.isPending}
                className="flex-1 bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
