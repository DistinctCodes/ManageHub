'use client';

import React from 'react';

interface Seat {
  id: string;
  label: string;
  x: number; // Percentage or absolute grid coordinate
  y: number; // Percentage or absolute grid coordinate
  width?: number;
  height?: number;
  status: 'AVAILABLE' | 'BOOKED';
}

interface FloorPlanViewProps {
  seatLayout: {
    dimensions?: { width: number; height: number };
    seats: Seat[];
  } | null;
  selectedSeatId: string | null;
  onSelectSeat: (seat: Seat) => void;
  floorPlanImageUrl?: string | null;
}

export default function FloorPlanView({
  seatLayout,
  selectedSeatId,
  onSelectSeat,
  floorPlanImageUrl,
}: FloorPlanViewProps) {
  
  // Graceful fallback for workspaces missing structured spatial positioning schemas
  if (!seatLayout || !seatLayout.seats || seatLayout.seats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-center text-slate-500">
        <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <h3 className="font-semibold text-slate-800">No Interactive Floor Plan Configured</h3>
        <p className="text-sm max-w-sm mt-1">
          This workspace hasn't set up visual map layouts yet. You can still secure an open hot desk directly using the booking panel.
        </p>
      </div>
    );
  }

  const bgWidth = seatLayout.dimensions?.width || 800;
  const bgHeight = seatLayout.dimensions?.height || 600;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-emerald-500 border border-emerald-600 block shadow-sm" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-rose-500 border border-rose-600 block shadow-sm" />
          <span>Reserved / Occupied</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-blue-500 border border-blue-600 block shadow-sm" />
          <span>Your Selection</span>
        </div>
      </div>

      {/* SVG Interactive Canvas Layer */}
      <div className="relative w-full overflow-auto border border-slate-200 rounded-xl bg-slate-100 shadow-inner p-4 max-h-[600px]">
        <svg
          viewBox={`0 0 ${bgWidth} ${bgHeight}`}
          className="w-full h-auto mx-auto max-w-4xl block relative z-10"
        >
          {/* Background Map Rendering */}
          {floorPlanImageUrl && (
            <image
              href={floorPlanImageUrl}
              width={bgWidth}
              height={bgHeight}
              preserveAspectRatio="xMidYMid slice"
              className="opacity-90"
            />
          )}

          {/* Map Seats Layout Layer */}
          {seatLayout.seats.map((seat) => {
            const isBooked = seat.status === 'BOOKED';
            const isSelected = selectedSeatId === seat.id;

            // Determine dynamic coloring state tokens
            let fillClass = 'fill-emerald-500/80 stroke-emerald-600 hover:fill-emerald-400';
            if (isBooked) fillClass = 'fill-rose-500/80 stroke-rose-600 cursor-not-allowed';
            if (isSelected) fillClass = 'fill-blue-500/90 stroke-blue-600 animate-pulse';

            return (
              <g
                key={seat.id}
                className={isBooked ? '' : 'cursor-pointer group'}
                onClick={() => !isBooked && onSelectSeat(seat)}
              >
                <rect
                  x={seat.x}
                  y={seat.y}
                  width={seat.width || 40}
                  height={seat.height || 40}
                  rx="6"
                  className={`${fillClass} transition-all stroke-2 shadow-sm`}
                />
                <text
                  x={seat.x + (seat.width || 40) / 2}
                  y={seat.y + (seat.height || 40) / 2 + 4}
                  textAnchor="middle"
                  className={`text-[10px] font-bold select-none pointer-events-none tracking-tighter ${
                    isSelected || isBooked ? 'fill-white' : 'fill-slate-800 group-hover:fill-slate-900'
                  }`}
                >
                  {seat.label}
                </text>
                
                {/* Desktop hover tooltips */}
                {!isBooked && (
                  <title>{`Seat ${seat.label} (Click to Pre-select)`}</title>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}