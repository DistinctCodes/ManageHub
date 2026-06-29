'use client';

import React, { useState, useEffect } from 'react';
import FloorPlanView from '@/components/workspaces/FloorPlanView';

interface WorkspaceDetails {
  id: string;
  name: string;
  description: string;
  floorPlanImageUrl?: string | null;
  seatLayout: any | null;
}

export default function WorkspaceDetailPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<'info' | 'floor_plan'>('info');
  const [workspace, setWorkspace] = useState<WorkspaceDetails | null>(null);
  const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Real-time parsed map dynamic data state
  const [liveSeatLayout, setLiveSeatLayout] = useState<any | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => {
    // Initial workspace detail call
    fetch(`/api/v1/workspaces/${params.id}`)
      .then((res) => res.json())
      .then((json) => setWorkspace(json.data));
  }, [params.id]);

  useEffect(() => {
    if (activeTab === 'floor_plan' && targetDate) {
      // Dynamic availability telemetry call driven explicitly by target date adjustments
      fetch(`/api/v1/workspaces/${params.id}/seat-map?date=${targetDate}`)
        .then((res) => res.json())
        .then((json) => setLiveSeatLayout(json.data))
        .catch((err) => console.error('Error synchronizing active occupancy map matrix:', err));
    }
  }, [activeTab, targetDate, params.id]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 text-slate-900">
      <div className="border-b border-slate-200 pb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{workspace?.name || 'Loading Workspace...'}</h1>
          <p className="text-sm text-slate-500 mt-1">Review desk amenities, configurations, and spatial assignments.</p>
        </div>

        {/* Workspace Secondary Section Tab Controller Switch */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'info' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('floor_plan')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'floor_plan' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}
          >
            Floor Plan Layout Map
          </button>
        </div>
      </div>

      {activeTab === 'info' ? (
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <h2 className="text-xl font-bold">About this space</h2>
          <p className="text-slate-600 text-sm leading-relaxed">{workspace?.description}</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3 items-start">
          <div className="md:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold">Interactive Seat Selection Map</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Target Booking Date:</span>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => {
                    setTargetDate(e.target.value);
                    setSelectedSeat(null); // Clear selections on state changes
                  }}
                  className="border border-slate-300 rounded-lg p-1.5 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <FloorPlanView
              seatLayout={liveSeatLayout}
              selectedSeatId={selectedSeat?.id || null}
              onSelectSeat={(seat) => setSelectedSeat({ id: seat.id, label: seat.label })}
              floorPlanImageUrl={workspace?.floorPlanImageUrl}
            />
          </div>

          {/* Seat Map Checkout Intent Interceptor Sidebar Panel */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-md font-bold tracking-tight text-slate-800">Booking Pipeline Allocation</h3>
            {selectedSeat ? (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm space-y-2">
                  <div className="flex justify-between"><span className="text-slate-500">Selected Desk:</span><span className="font-bold text-blue-700">Seat {selectedSeat.label}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Scheduled Date:</span><span className="font-mono font-medium">{targetDate}</span></div>
                </div>
                <button
                  onClick={() => alert(`Redirecting to payment checkout initializing for Seat: ${selectedSeat.label} on ${targetDate}`)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 px-4 rounded-xl shadow transition-colors"
                >
                  Book Seat {selectedSeat.label} Now
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Select an open green desk node on the visual floor plan grid to verify point specs and proceed directly into processing.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}