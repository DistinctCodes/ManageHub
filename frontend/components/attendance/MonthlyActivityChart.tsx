"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AttendanceRecord } from "@/lib/react-query/hooks/workspace-tracking/useAttendanceHistory";

interface MonthlyActivityChartProps {
  data: AttendanceRecord[];
}

export default function MonthlyActivityChart({ data }: MonthlyActivityChartProps) {
  const processDataForChart = (records: AttendanceRecord[]) => {
    const daysInMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0
    ).getDate();
    const chartData = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      hours: 0,
    }));

    records.forEach((record) => {
      const checkInDate = new Date(record.checkInTime);
      const dayOfMonth = checkInDate.getDate();
      chartData[dayOfMonth - 1].hours += record.duration / 3600; // Assuming duration is in seconds
    });

    return chartData;
  };

  const chartData = processDataForChart(data);

  if (!data.length) {
    return (
      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h3 className="font-semibold">Monthly Activity</h3>
        <div className="h-80 flex items-center justify-center">
          <p className="text-muted-foreground">No check-ins yet — book a workspace to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
      <h3 className="font-semibold mb-4">Monthly Activity</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              allowDecimals={false}
              unit="h"
            />
            <Tooltip
              contentStyle={{
                borderRadius: "var(--radius)",
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--card))",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(value: number) => [\`\${value.toFixed(2)} hours\`, "Duration"]}
            />
            <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}