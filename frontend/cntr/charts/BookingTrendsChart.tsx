'use client';
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface BookingTrendsData {
  date: string;
  bookings: number;
  cancellations: number;
}

interface Props {
  data: BookingTrendsData[];
  period: 'week' | 'month';
}

export const BookingTrendsChart: React.FC<Props> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="w-full h-64 animate-pulse bg-gray-200 rounded-lg flex items-center justify-center">
        <span className="text-gray-400 text-sm">Loading chart data…</span>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend verticalAlign="bottom" />
        <Line type="monotone" dataKey="bookings" name="New Bookings" stroke="#3b82f6" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="cancellations" name="Cancellations" stroke="#ef4444" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
};