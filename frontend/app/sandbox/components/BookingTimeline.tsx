"use client";

const STAGES = [
  "Created",
  "Payment Received",
  "Confirmed",
  "Checked In",
  "Completed",
] as const;

type Stage = (typeof STAGES)[number] | "Cancelled";

interface Props {
  currentStatus: Stage;
  timestamps: Partial<Record<Stage, string | null>>;
}

export function BookingTimeline({ currentStatus, timestamps }: Props) {
  const stages = currentStatus === "Cancelled"
    ? [...STAGES.slice(0, STAGES.indexOf("Completed")), "Cancelled" as Stage]
    : [...STAGES];

  const currentIdx = stages.indexOf(currentStatus);

  return (
    <ol className="relative border-l border-gray-200 space-y-6 pl-6">
      {stages.map((stage, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        const cancelled = stage === "Cancelled";

        return (
          <li key={stage} className="relative">
            {/* Circle indicator */}
            <span
              className={[
                "absolute -left-[1.65rem] flex h-5 w-5 items-center justify-center rounded-full border-2",
                done
                  ? "border-green-500 bg-green-500"
                  : active && cancelled
                  ? "border-red-500 bg-red-500"
                  : active
                  ? "border-blue-500 bg-white"
                  : "border-gray-300 bg-white",
              ].join(" ")}
            >
              {done && (
                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              {active && !cancelled && (
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              )}
            </span>

            {/* Label + timestamp */}
            <div className="ml-1">
              <p className={[
                "text-sm font-medium",
                done ? "text-green-700" : active && cancelled ? "text-red-600" : active ? "text-blue-700" : "text-gray-400",
              ].join(" ")}>
                {stage}
              </p>
              {timestamps[stage] && (
                <p className="text-xs text-gray-400">{timestamps[stage]}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default BookingTimeline;
