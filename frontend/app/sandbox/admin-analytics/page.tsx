"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const REVENUE_DATA = MONTHS.map((month, i) => ({
  month,
  revenue: Math.round(4000 + Math.sin(i) * 1500 + i * 300),
}));

const BOOKING_DATA = [
  { type: "Private Office", count: 42 },
  { type: "Hot Desk", count: 87 },
  { type: "Meeting Room", count: 63 },
  { type: "Event Space", count: 19 },
];

function Skeleton() {
  return <div className="h-64 w-full animate-pulse rounded-lg bg-gray-100" />;
}

export default function AdminAnalyticsPage() {
  const [loading] = useState(false);
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState("2026-12-31");

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Admin Analytics</h1>
          <div className="flex items-center gap-3 text-sm">
            <label className="text-gray-600">
              From{" "}
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="ml-1 rounded border border-gray-300 px-2 py-1"
              />
            </label>
            <label className="text-gray-600">
              To{" "}
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="ml-1 rounded border border-gray-300 px-2 py-1"
              />
            </label>
          </div>
        </div>

        {/* Revenue chart */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-700">
            Revenue by Month ({startDate.slice(0, 4)})
          </h2>
          {loading ? (
            <Skeleton />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={REVENUE_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(v: number | undefined) => [
                    `$${(v ?? 0).toLocaleString()}`,
                    "Revenue",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bookings chart */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-700">
            Bookings by Workspace Type
          </h2>
          {loading ? (
            <Skeleton />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={BOOKING_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
