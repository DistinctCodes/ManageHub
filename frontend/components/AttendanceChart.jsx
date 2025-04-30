import React, { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from "recharts";

const data = [
  { name: "Present", value: 48 },
  { name: "Absent", value: 52 },
];

const COLORS = ["#15DE9F", "#227580"];

const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } =
    props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        cornerRadius={6}
      />
    </g>
  );
};

export default function AttendanceChart() {
  const [userType, setUserType] = useState("Staff");

  const handleToggle = (type) => {
    setUserType(type);
  };

  return (
    <div className="p-4">
      <div className="flex justify-center mt-3">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            className={`px-4  text-[12px] font-medium rounded-l-lg ${
              userType === "Staff"
                ? "bg-white text-gray-900"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
            onClick={() => handleToggle("Staff")}
          >
            Staff
          </button>

          <button
            type="button"
            className={`px-4 py-2 text-[12px] font-medium rounded-r-lg ${
              userType === "Hub User"
                ? "bg-white text-gray-900"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
            onClick={() => handleToggle("Hub User")}
          >
            Hub User
          </button>
        </div>
      </div>

      <div className="w-[200px] max-w-full mx-auto">
        <ResponsiveContainer width="100%" height={120}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={-10}
              dataKey="value"
              activeShape={renderActiveShape}
              activeIndex={[0, 1]}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="flex justify-between mt-4">
          <div className="text-center">
            <p className="text-[13px] font-bold text-gray-600">48%</p>
            <p className="text-[11px] text-gray-600 font-semibold -mt-1">
              Present
            </p>
          </div>
          <div className="text-center">
            <p className="text-[13px] font-bold text-gray-600">52%</p>
            <p className="text-[11px] text-gray-600 font-semibold -mt-1">
              Absent
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
