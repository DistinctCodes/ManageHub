"use client";

import { useRouter } from "next/navigation";

interface Zone {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  workspaceId: string;
  availableSeats?: number;
  totalSeats?: number;
}

interface FloorPlan {
  id: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  backgroundImageUrl?: string;
  zones: Zone[];
}

interface Props {
  floorPlan: FloorPlan;
}

function availabilityColor(zone: Zone) {
  if (!zone.totalSeats) return zone.color || "#6b7280";
  const ratio = (zone.availableSeats ?? 0) / zone.totalSeats;
  if (ratio <= 0) return "#ef4444";
  if (ratio < 0.25) return "#f59e0b";
  return "#22c55e";
}

export default function FloorPlanCanvas({ floorPlan }: Props) {
  const router = useRouter();

  return (
    <div className="overflow-auto border border-gray-200 rounded-xl bg-gray-50 p-4">
      <svg
        viewBox={`0 0 ${floorPlan.canvasWidth} ${floorPlan.canvasHeight}`}
        width={floorPlan.canvasWidth}
        height={floorPlan.canvasHeight}
        className="max-w-full touch-pinch-zoom"
        style={{ touchAction: "pinch-zoom" }}
      >
        {floorPlan.backgroundImageUrl && (
          <image
            href={floorPlan.backgroundImageUrl}
            x={0} y={0}
            width={floorPlan.canvasWidth}
            height={floorPlan.canvasHeight}
            preserveAspectRatio="xMidYMid meet"
          />
        )}
        {floorPlan.zones.map((zone) => (
          <g
            key={zone.id}
            className="cursor-pointer"
            onClick={() => router.push(`/bookings/new?workspaceId=${zone.workspaceId}`)}
          >
            <rect
              x={zone.x} y={zone.y}
              width={zone.width} height={zone.height}
              fill={availabilityColor(zone)}
              fillOpacity={0.7}
              stroke="#fff"
              strokeWidth={2}
              rx={4}
            />
            <text
              x={zone.x + zone.width / 2}
              y={zone.y + zone.height / 2 + 5}
              textAnchor="middle"
              fontSize={12}
              fill="#fff"
              fontWeight={600}
            >
              {zone.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="flex gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> Available</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500 inline-block" /> Limited</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> Full</span>
      </div>
    </div>
  );
}
