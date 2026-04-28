"use client";

import { useEffect, useMemo, useState } from "react";

interface CountdownTimerProps {
  targetDate: string;
  label: string;
  compact?: boolean;
}

interface TimeLeft {
  totalSeconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(targetDate: string): TimeLeft {
  const target = new Date(targetDate).getTime();

  if (Number.isNaN(target)) {
    return { totalSeconds: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const diffMs = Math.max(0, target - Date.now());
  const totalSeconds = Math.floor(diffMs / 1000);

  return {
    totalSeconds,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getCompletionText(label: string) {
  const lower = label.toLowerCase();
  const isExpiry = lower.includes("expire") || lower.includes("membership");
  return isExpiry ? "Expired" : "Started";
}

function TimeBox({ value, unit }: { value: string; unit: string }) {
  return (
    <div className="min-w-16 rounded-xl border border-gray-200 bg-white px-3 py-2 text-center shadow-sm">
      <div className="text-lg font-semibold tabular-nums text-gray-900">
        {value}
      </div>
      <div className="text-xs uppercase tracking-wide text-gray-500">
        {unit}
      </div>
    </div>
  );
}

export default function CountdownTimer({
  targetDate,
  label,
  compact = false,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    getTimeLeft(targetDate),
  );

  useEffect(() => {
    setTimeLeft(getTimeLeft(targetDate));
    const intervalId = window.setInterval(() => {
      setTimeLeft(getTimeLeft(targetDate));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [targetDate]);

  const doneText = useMemo(() => getCompletionText(label), [label]);

  if (timeLeft.totalSeconds <= 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-600">{label}</p>
        <p className="mt-1 text-lg font-semibold text-gray-900">{doneText}</p>
      </div>
    );
  }

  const compactHours = Math.floor(timeLeft.totalSeconds / 3600);

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="mb-3 text-sm text-gray-600">{label}</p>

      <div className="flex flex-wrap gap-2">
        {compact ? (
          <>
            <TimeBox value={pad(compactHours)} unit="Hours" />
            <TimeBox value={pad(timeLeft.minutes)} unit="Minutes" />
            <TimeBox value={pad(timeLeft.seconds)} unit="Seconds" />
          </>
        ) : (
          <>
            <TimeBox value={pad(timeLeft.days)} unit="Days" />
            <TimeBox value={pad(timeLeft.hours)} unit="Hours" />
            <TimeBox value={pad(timeLeft.minutes)} unit="Minutes" />
            <TimeBox value={pad(timeLeft.seconds)} unit="Seconds" />
          </>
        )}
      </div>
    </div>
  );
}
