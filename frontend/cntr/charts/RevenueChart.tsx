'use client';
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

export interface RevenueData {
  month: string;
  revenueKobo: number;
}

interface Props {
  data: RevenueData[];
}

function formatNaira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString('en-NG')}`;
}

export const RevenueChart: React.FC<Props> = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data} margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
      <YAxis tickFormatter={(v) => formatNaira(v)} tick={{ fontSize: 11 }} width={90} />
      <Tooltip formatter={(value: number) => [formatNaira(value), 'Revenue']} />
      <Bar dataKey="revenueKobo" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
);