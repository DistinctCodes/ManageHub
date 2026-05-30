'use client';
import React from 'react';
import { useWebSocket } from './useWebSocket';

interface OccupancyPayload {
  current: number;
}

interface Props {
  wsUrl: string;
  capacity: number;
}

export const LiveOccupancyWidget: React.FC<Props> = ({ wsUrl, capacity }) => {
  const { data, status } = useWebSocket<OccupancyPayload>(wsUrl);

  if (status === 'connecting') {
    return <div className="p-4 rounded-lg bg-gray-100 text-gray-500 text-sm">Connecting…</div>;
  }

  const current = data?.current ?? 0;
  const pct = capacity > 0 ? (current / capacity) * 100 : 0;
  const colour = pct >= 90 ? 'bg-red-100 text-red-700' : pct >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';

  return (
    <div className={`p-4 rounded-lg ${colour} text-sm font-medium`}>
      {current} / {capacity} occupied
    </div>
  );
};