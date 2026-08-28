"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SettlementBatch } from "@/lib/admin-api";

const AXIS_COLOR = "#64748b";

export function SettlementVolumeChart({
  batches,
}: {
  batches: SettlementBatch[];
}) {
  const byStatus = new Map<string, number>();
  for (const batch of batches) {
    byStatus.set(batch.status, (byStatus.get(batch.status) ?? 0) + batch.totalAmount);
  }

  const data = Array.from(byStatus.entries()).map(([status, totalAmount]) => ({
    status,
    totalAmount,
  }));

  if (data.length === 0) {
    return (
      <p className="px-5 py-6 text-sm text-gray-500 dark:text-gray-400">
        No settlement data to chart yet.
      </p>
    );
  }

  return (
    <div className="h-64 w-full px-2 py-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="status"
            tick={{ fontSize: 11, fill: AXIS_COLOR }}
            interval={0}
          />
          <YAxis tick={{ fontSize: 11, fill: AXIS_COLOR }} width={56} />
          <Tooltip
            formatter={(value: number | string) => Number(value).toLocaleString()}
            cursor={{ fill: "rgba(100,116,139,0.1)" }}
          />
          <Bar dataKey="totalAmount" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
