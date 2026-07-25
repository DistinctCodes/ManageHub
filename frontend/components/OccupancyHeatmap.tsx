'use client';

import { useState, useEffect } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

interface HeatmapCell { avgOccupants: number; utilizationPct: number; }

function cellColor(pct: number): string {
  if (pct === 0) return '#f3f4f6';
  if (pct < 25) return '#dbeafe';
  if (pct < 50) return '#93c5fd';
  if (pct < 75) return '#3b82f6';
  return '#1d4ed8';
}

function cellTextColor(pct: number): string {
  return pct >= 50 ? '#ffffff' : '#1f2937';
}

export default function OccupancyHeatmap() {
  const [matrix, setMatrix] = useState<HeatmapCell[][] | null>(null);
  const [showValues, setShowValues] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 28 * 86400_000);
    fetch(`${BASE_URL}/reports/occupancy-heatmap?from=${from.toISOString()}&to=${to.toISOString()}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setMatrix(d.matrix))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-40 animate-pulse bg-muted rounded" aria-busy="true" aria-label="Loading heatmap" />;
  if (!matrix) return <p className="text-destructive text-sm">Failed to load heatmap.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sm">Occupancy Heatmap (last 4 weeks)</h2>
        <button onClick={() => setShowValues(v => !v)} className="text-xs underline text-muted-foreground">
          {showValues ? 'Hide values' : 'Show values'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(24, minmax(22px,1fr))', gap: 2 }}>
          <div />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="text-center text-xs text-muted-foreground">{h}</div>
          ))}
          {matrix.map((dayRow, d) => (
            <>
              <div key={'label-' + d} className="text-xs font-medium flex items-center">{DAYS[d]}</div>
              {dayRow.map((cell, h) => (
                <div
                  key={h}
                  style={{ backgroundColor: cellColor(cell.utilizationPct), color: cellTextColor(cell.utilizationPct), minHeight: 22, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  aria-label={DAYS[d] + ' ' + h + ':00 - ' + cell.utilizationPct + '% utilization, avg ' + cell.avgOccupants + ' occupants'}
                  title={DAYS[d] + ' ' + h + ':00: ' + cell.utilizationPct + '% (' + cell.avgOccupants + ' avg)'}
                >
                  {showValues && <span style={{ fontSize: 9 }}>{cell.utilizationPct}%</span>}
                </div>
              ))}
            </>
          ))}
        </div>
      </div>
      <div className="flex gap-3 mt-3 text-xs text-muted-foreground items-center">
        {['0%', '25%', '50%', '75%', '100%'].map((l, i) => (
          <span key={l} className="flex items-center gap-1">
            <span style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: ['#f3f4f6','#dbeafe','#93c5fd','#3b82f6','#1d4ed8'][i], display: 'inline-block' }} />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}
