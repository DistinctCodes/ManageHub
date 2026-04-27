"use client";

import { useMemo, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SeatStatus = "available" | "occupied" | "selected";

export interface Seat {
  number: number;
  status: SeatStatus;
}

export interface SeatMapProps {
  /** Seat data array — each seat has a number and status */
  seats: Seat[];
  /** Number of columns in the grid */
  columns?: number;
  /** Called with the seat number when an available seat is clicked (to select it) */
  onSeatSelect?: (seatNumber: number) => void;
  /** Called with the seat number when a selected seat is clicked (to deselect it) */
  onSeatDeselect?: (seatNumber: number) => void;
  /** Optional label shown above the map */
  label?: string;
}

// ─── Style tokens ─────────────────────────────────────────────────────────────

const SEAT_STYLES: Record<SeatStatus, React.CSSProperties> = {
  available: {
    background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
    border: "2px solid #15803d",
    color: "#ffffff",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(34,197,94,0.35)",
  },
  occupied: {
    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    border: "2px solid #b91c1c",
    color: "#ffffff",
    cursor: "not-allowed",
    opacity: 0.75,
    boxShadow: "0 2px 6px rgba(239,68,68,0.25)",
  },
  selected: {
    background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
    border: "2px solid #1d4ed8",
    color: "#ffffff",
    cursor: "pointer",
    boxShadow: "0 2px 10px rgba(59,130,246,0.45)",
  },
};

const LEGEND_ITEMS: { status: SeatStatus; label: string }[] = [
  { status: "available", label: "Available" },
  { status: "occupied",  label: "Occupied"  },
  { status: "selected",  label: "Selected"  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SeatButtonProps {
  seat: Seat;
  onSelect: (n: number) => void;
  onDeselect: (n: number) => void;
}

function SeatButton({ seat, onSelect, onDeselect }: SeatButtonProps) {
  const { number, status } = seat;

  function handleClick() {
    if (status === "occupied") return;
    if (status === "selected") onDeselect(number);
    else onSelect(number);
  }

  return (
    <button
      id={`seat-${number}`}
      aria-label={`Seat ${number} — ${status}`}
      aria-pressed={status === "selected"}
      disabled={status === "occupied"}
      onClick={handleClick}
      style={{
        ...SEAT_STYLES[status],
        width: "100%",
        aspectRatio: "1",
        minWidth: 40,
        maxWidth: 64,
        borderRadius: "10px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "11px",
        fontWeight: 600,
        lineHeight: 1.1,
        gap: 2,
        transition: "transform 120ms ease, box-shadow 120ms ease, opacity 120ms ease",
        outline: "none",
        userSelect: "none",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        if (status === "occupied") return;
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.1)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
    >
      {/* Chair icon silhouette */}
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        style={{ width: 16, height: 16, opacity: 0.9 }}
        aria-hidden="true"
      >
        <path d="M7 3a2 2 0 0 0-2 2v6H4a1 1 0 0 0-1 1v2a3 3 0 0 0 3 3h1v2a1 1 0 0 0 2 0v-2h6v2a1 1 0 0 0 2 0v-2h1a3 3 0 0 0 3-3v-2a1 1 0 0 0-1-1h-1V5a2 2 0 0 0-2-2H7zm0 2h10v6H7V5zm-2 8h14v2a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-2z" />
      </svg>
      <span style={{ fontSize: "10px", opacity: 0.95 }}>{number}</span>
    </button>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "16px",
        justifyContent: "center",
        marginTop: "20px",
        padding: "12px 16px",
        background: "rgba(241,245,249,0.7)",
        borderRadius: "10px",
        border: "1px solid #e2e8f0",
      }}
    >
      {LEGEND_ITEMS.map(({ status, label }) => (
        <div
          key={status}
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: 16,
              height: 16,
              borderRadius: 4,
              ...SEAT_STYLES[status],
              boxShadow: "none",
              cursor: "default",
              opacity: 1,
            }}
          />
          <span style={{ fontSize: "13px", color: "#475569", fontWeight: 500 }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SeatMap({
  seats,
  columns = 6,
  onSeatSelect,
  onSeatDeselect,
  label,
}: SeatMapProps) {
  // Sort seats by number so the grid is always in order
  const sorted = useMemo(() => [...seats].sort((a, b) => a.number - b.number), [seats]);

  const stats = useMemo(
    () => ({
      available: sorted.filter((s) => s.status === "available").length,
      occupied:  sorted.filter((s) => s.status === "occupied").length,
      selected:  sorted.filter((s) => s.status === "selected").length,
    }),
    [sorted],
  );

  function handleSelect(n: number) {
    onSeatSelect?.(n);
  }

  function handleDeselect(n: number) {
    onSeatDeselect?.(n);
  }

  return (
    <div style={{ width: "100%" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
          marginBottom: "16px",
        }}
      >
        {label && (
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#1e293b", margin: 0 }}>
            {label}
          </h3>
        )}
        <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "#64748b" }}>
          <span>
            <strong style={{ color: "#22c55e" }}>{stats.available}</strong> available
          </span>
          <span>
            <strong style={{ color: "#ef4444" }}>{stats.occupied}</strong> occupied
          </span>
          {stats.selected > 0 && (
            <span>
              <strong style={{ color: "#3b82f6" }}>{stats.selected}</strong> selected
            </span>
          )}
        </div>
      </div>

      {/* Stage / screen banner */}
      <div
        aria-label="Stage / entrance"
        style={{
          textAlign: "center",
          marginBottom: "20px",
          padding: "8px 0",
          background: "linear-gradient(90deg, transparent, #cbd5e1, transparent)",
          borderRadius: "6px",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.1em",
          color: "#64748b",
          textTransform: "uppercase",
        }}
      >
        ── Stage / Front ──
      </div>

      {/* Seat grid */}
      <div
        role="group"
        aria-label="Seat map"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, minmax(40px, 64px))`,
          gap: "10px",
          justifyContent: "center",
        }}
      >
        {sorted.map((seat) => (
          <SeatButton
            key={seat.number}
            seat={seat}
            onSelect={handleSelect}
            onDeselect={handleDeselect}
          />
        ))}
      </div>

      {/* Legend */}
      <Legend />
    </div>
  );
}

// ─── SeatMapDemo ──────────────────────────────────────────────────────────────

export function SeatMapDemo() {
  const [seats, setSeats] = useState<Seat[]>(() =>
    Array.from({ length: 24 }, (_, i) => ({
      number: i + 1,
      status: [3, 7, 11, 14, 18, 22].includes(i + 1) ? "occupied" : ("available" as SeatStatus),
    }))
  );

  function handleSelect(seatNumber: number) {
    setSeats((prev: Seat[]) =>
      prev.map((s) => (s.number === seatNumber ? { ...s, status: "selected" as SeatStatus } : s))
    );
  }

  function handleDeselect(seatNumber: number) {
    setSeats((prev: Seat[]) =>
      prev.map((s) => (s.number === seatNumber ? { ...s, status: "available" as SeatStatus } : s))
    );
  }

  const selected = seats.filter((s: Seat) => s.status === "selected").map((s: Seat) => s.number);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
        <SeatMap
          seats={seats}
          columns={6}
          label="The Hive — Floor 2"
          onSeatSelect={handleSelect}
          onSeatDeselect={handleDeselect}
        />

        {selected.length > 0 && (
          <div className="mt-6 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
              <span>
                <strong>Selected seats:</strong> {selected.join(", ")}
              </span>
              <button
                onClick={() =>
                  setSeats((prev: Seat[]) =>
                    prev.map((s) => (s.status === "selected" ? { ...s, status: "available" as SeatStatus } : s))
                  )
                }
                className="font-medium underline hover:no-underline"
              >
                Clear all
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-gray-50 border border-gray-100 p-4">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Technical Details</h4>
        <ul className="text-xs text-gray-500 space-y-1 list-disc ml-4">
          <li>Responsive CSS Grid layout with configurable columns</li>
          <li>Interactive state management with multi-select support</li>
          <li>Color-coded status indicators (Available, Occupied, Selected)</li>
          <li>Accessibility: aria-labels and keyboard-friendly buttons</li>
        </ul>
      </div>
    </div>
  );
}
