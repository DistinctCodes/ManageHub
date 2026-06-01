import React from 'react';

interface UtilizationStats { utilizationPercent: number; totalBookedHours: number; peakDate: string; quietDate: string; }
interface Props { workspaceName: string; capacity: number; stats: UtilizationStats; }

function ringColor(pct: number) { return pct >= 80 ? '#ef4444' : pct >= 50 ? '#eab308' : '#22c55e'; }
function fmtDay(d: string) { return new Intl.DateTimeFormat('en', { weekday: 'long' }).format(new Date(d)); }

export function WorkspaceUtilizationCard({ workspaceName, capacity, stats }: Props) {
  const { utilizationPercent: pct, totalBookedHours, peakDate, quietDate } = stats;
  const r = 40; const circ = 2 * Math.PI * r; const dash = (pct / 100) * circ;
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h3 className="font-semibold text-sm">{workspaceName} <span className="text-muted-foreground">(cap: {capacity})</span></h3>
      <div className="flex justify-center">
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <circle cx="50" cy="50" r={r} fill="none" stroke={ringColor(pct)} strokeWidth="10"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 50 50)" />
          <text x="50" y="55" textAnchor="middle" fontSize="14" fontWeight="bold">{pct}%</text>
        </svg>
      </div>
      <div className="text-xs space-y-1">
        <p>Booked hours: <strong>{totalBookedHours}</strong></p>
        <p>Peak day: <strong>{fmtDay(peakDate)}</strong></p>
        <p>Quiet day: <strong>{fmtDay(quietDate)}</strong></p>
      </div>
    </div>
  );
}