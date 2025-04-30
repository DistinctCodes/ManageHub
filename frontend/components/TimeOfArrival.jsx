import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { time: "8:00 AM", value: 0 },
  { time: "9:00 AM", value: 25 },
  { time: "10:00 AM", value: 32 },
  { time: "11:00 AM", value: 25 },
  { time: "12:00 PM", value: 20 },
  { time: "1:00 PM", value: 28 },
  { time: "2:00 PM", value: 45 },
  { time: "3:00 PM", value: 65 },
  { time: "4:00 PM", value: 55 },
  { time: "5:00 PM", value: 50 },
  { time: "6:00 PM", value: 115 },
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-100 p-4 rounded shadow">
        <p className="font-medium text-gray-800">08 Feb</p>
        <p className="text-gray-600">{payload[0].payload.time}</p>
        <p className="font-medium text-gray-800">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

const TimeOfArrivalChart = () => {
  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
        >
          <CartesianGrid vertical={false} stroke="#f0f0f0" />
          <XAxis
            dataKey="time"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#666", fontSize: 12 }}
            padding={{ left: 30, right: 30 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#666", fontSize: 12 }}
            domain={[0, 160]}
            ticks={[0, 20, 40, 60, 80, 100, 120, 140, 160]}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#0F766E"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 8, fill: "#0F766E" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TimeOfArrivalChart;
