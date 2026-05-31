'use client';
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

export interface OccupancyPieData {
  workspaceName: string;
  occupancyPercent: number;
}

interface Props {
  data: OccupancyPieData[];
}

const COLOURS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const OccupancyPieChart: React.FC<Props> = ({ data }) => (
  <PieChart width={400} height={320}>
    <Pie
      data={data}
      dataKey="occupancyPercent"
      nameKey="workspaceName"
      cx="50%"
      cy="45%"
      outerRadius={110}
      label={({ name, value }: { name: string; value: number }) => `${name}: ${value}%`}
    >
      {data.map((_, i) => (
        <Cell key={i} fill={COLOURS[i % COLOURS.length]} />
      ))}
    </Pie>
    <Tooltip formatter={(value: number) => `${value}%`} />
    <Legend verticalAlign="bottom" />
  </PieChart>
);