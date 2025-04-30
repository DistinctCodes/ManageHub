import React from "react";
import { BarChart, Bar, XAxis, YAxis } from "recharts";

const data = [
  { name: "Conference Room", value: 24, starred: true },
  { name: "Hub One", value: 18, starred: false },
  { name: "Hub Two", value: 26, starred: false },
  { name: "Studio 1", value: 12, starred: false },
  { name: "Studio 2", value: 24, starred: false },
  { name: "Training Room", value: 17, starred: false },
];

const SpaceDistributionChart = ({ width }) => {
  const maxValue = Math.max(...data.map((item) => item.value));

  return (
    <div className="mt-4 relative ">
      <BarChart
        width={width} // Reduced width to leave space for labels
        height={230}
        data={data}
        layout="vertical"
        margin={{ top: 1, right: 0, left: 20, bottom: 5 }}
      >
        <XAxis type="number" hide domain={[0, maxValue]} />
        <YAxis
          type="category"
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{
            fontSize: 11,
            fill: "#475467",
            width: 100,
          }}
        />
        <Bar dataKey="value" fill="#227580" barSize={20} />
      </BarChart>
      {/* Overlay the values on the right */}
      <div
        className="absolute top-0 right-4 pt-[2px]"
        style={{ height: "calc(100% - 30px)" }}
      >
        {data.map((item, index) => (
          <div
            key={index}
            className="text-[#475467] text-[11px] font-semibold"
            style={{
              height: "37px", // 250px / 6 items
              display: "flex",
              alignItems: "center",
            }}
          >
            {item.value}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpaceDistributionChart;