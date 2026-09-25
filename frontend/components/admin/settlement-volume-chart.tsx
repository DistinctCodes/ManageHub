"use client";

import { useEffect, useMemo, useState } from "react";
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
const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  IN_PROGRESS: "#3b82f6",
  PARTIALLY_SETTLED: "#8b5cf6",
  SETTLED: "#10b981",
  FAILED: "#ef4444",
  ABANDONED: "#6b7280",
};

/**
 * True when the viewport is at or below the Tailwind `sm` breakpoint.
 * Recharts charts re-render on their own resize observer, but axis sizing,
 * tick density, and the legend need to react to the breakpoint explicitly.
 */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? window.matchMedia(query).matches
      : false,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);

  return matches;
}

function compactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

export function SettlementVolumeChart({
  batches,
}: {
  batches: SettlementBatch[];
}) {
  const isMobile = useMediaQuery("(max-width: 640px)");

  const data = useMemo(() => {
    const byStatus = new Map<string, number>();
    for (const batch of batches) {
      byStatus.set(
        batch.status,
        (byStatus.get(batch.status) ?? 0) + batch.totalAmount,
      );
    }
    return Array.from(byStatus.entries()).map(([status, totalAmount]) => ({
      status,
      totalAmount,
    }));
  }, [batches]);

  if (data.length === 0) {
    return (
      <p className="px-5 py-6 text-sm text-gray-500 dark:text-gray-400">
        No settlement data to chart yet.
      </p>
    );
  }

  return (
    <div className="h-56 w-full min-w-0 px-2 py-4 sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={
            isMobile
              ? { top: 8, right: 8, bottom: 0, left: 0 }
              : { top: 8, right: 16, bottom: 8, left: 8 }
          }
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="status"
            tick={{ fontSize: isMobile ? 10 : 11, fill: AXIS_COLOR }}
            interval={isMobile ? "preserveStartEnd" : 0}
            angle={isMobile ? -20 : 0}
            height={isMobile ? 44 : 30}
            textAnchor={isMobile ? "end" : "middle"}
          />
          {/* A fixed 56px y-axis eats a big share of a ~350px-wide card;
              on mobile we tighten it and abbreviate the labels. */}
          <YAxis
            tick={{ fontSize: 11, fill: AXIS_COLOR }}
            width={isMobile ? 42 : 56}
            tickFormatter={compactNumber}
          />
          <Tooltip
            formatter={(value) => Number(value ?? 0).toLocaleString()}
            cursor={{ fill: "rgba(100,116,139,0.1)" }}
          />
          <Bar dataKey="totalAmount" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Legend collapses on small viewports (hidden below the `sm`
          breakpoint) so the chart keeps its full width at mobile sizes. */}
      <div className="mt-2 hidden flex-wrap items-center gap-x-4 gap-y-1 sm:flex">
        {data.map(({ status }) => (
          <span
            key={status}
            className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[status] ?? "#2563eb" }}
            />
            {status}
          </span>
        ))}
      </div>
    </div>
  );
}