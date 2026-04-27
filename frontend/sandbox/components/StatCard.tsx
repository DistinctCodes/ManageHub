"use client";
import { useEffect, useRef, useState, ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Trend {
  direction: "up" | "down";
  percent: number;
}

interface StatCardProps {
  label: string;
  value: number;
  unit?: string;
  icon: ReactNode;
  iconBg?: string;
  trend?: Trend;
}

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return count;
}

export default function StatCard({ label, value, unit, icon, iconBg = "bg-blue-100 text-blue-600", trend }: StatCardProps) {
  const count = useCountUp(value);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <span className={`w-9 h-9 rounded-full flex items-center justify-center ${iconBg}`}>{icon}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-gray-900">
          {unit && <span className="text-xl mr-0.5">{unit}</span>}
          {count.toLocaleString()}
        </span>
        {trend && (
          <span className={`flex items-center gap-0.5 text-sm font-medium mb-0.5 ${trend.direction === "up" ? "text-green-600" : "text-red-500"}`}>
            {trend.direction === "up" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {trend.percent}%
          </span>
        )}
      </div>
    </div>
  );
}
