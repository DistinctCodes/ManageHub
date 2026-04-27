"use client";

import { useState, useMemo } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
  MapPin,
} from "lucide-react";
import { AvailabilityCalendar } from "./AvailabilityCalendar";

// ---- Types ----

export interface WizardWorkspace {
  id: string;
  name: string;
  type: string;
  totalSeats: number;
  availableSeats: number;
  hourlyRate: number; // kobo
  description?: string;
  amenities?: string[];
  images?: string[];
}

export interface SeatInfo {
  number: number;
  isAvailable: boolean;
}

export interface WizardBooking {
  workspaceId: string;
  workspaceName: string;
  startDate: string;
  endDate: string;
  seatNumber: number;
  totalCostKobo: number;
}

interface Props {
  workspaces: WizardWorkspace[];
  availabilityByWorkspace: Record<string, { date: string; availableSeats: number }[]>;
  seatsByWorkspace: Record<string, SeatInfo[]>;
  onConfirm?: (booking: WizardBooking) => void;
}

// ---- Constants ----

const STEPS = [
  { label: "Workspace", description: "Choose your space" },
  { label: "Dates", description: "Pick your dates" },
  { label: "Seat", description: "Select a seat" },
  { label: "Confirm", description: "Review & pay" },
];

const TYPE_LABELS: Record<string, string> = {
  COWORKING: "Coworking",
  PRIVATE_OFFICE: "Private Office",
  MEETING_ROOM: "Meeting Room",
  HOT_DESK: "Hot Desk",
  DEDICATED_DESK: "Dedicated Desk",
};

const TYPE_COLORS: Record<string, string> = {
  COWORKING: "bg-blue-50 text-blue-700",
  PRIVATE_OFFICE: "bg-purple-50 text-purple-700",
  MEETING_ROOM: "bg-amber-50 text-amber-700",
  HOT_DESK: "bg-green-50 text-green-700",
  DEDICATED_DESK: "bg-rose-50 text-rose-700",
};

// ---- Helpers ----

function formatNaira(kobo: number) {
  return (kobo / 100).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  });
}

function daysBetween(start: string, end: string) {
  const diff =
    Math.ceil(
      (new Date(end).getTime() - new Date(start).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;
  return Math.max(1, diff);
}

function formatDateDisplay(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-NG", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ---- Sub-components ----

function ProgressBar({ step }: { step: number }) {
  const total = STEPS.length;
  return (
    <div className="relative flex items-start justify-between">
      <div
        className="absolute top-4 h-0.5 bg-gray-200 z-0"
        style={{ left: 16, right: 16 }}
      />
      <div
        className="absolute top-4 h-0.5 bg-blue-500 z-0 transition-all duration-500"
        style={{
          left: 16,
          width:
            step === 0
              ? 0
              : `calc(${(step / (total - 1)) * 100}% - 32px)`,
        }}
      />
      {STEPS.map(({ label, description }, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <div key={i} className="relative z-10 flex flex-col items-center gap-1">
            <div
              className={[
                "w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-semibold transition-all duration-300",
                done
                  ? "bg-blue-600 border-blue-600 text-white"
                  : active
                  ? "bg-white border-blue-500 text-blue-600"
                  : "bg-white border-gray-200 text-gray-400",
              ].join(" ")}
            >
              {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <p
              className={`text-xs font-medium ${
                active ? "text-gray-900" : done ? "text-gray-600" : "text-gray-400"
              }`}
            >
              {label}
            </p>
            <p
              className={`text-xs hidden sm:block ${
                active ? "text-blue-500" : "text-gray-300"
              }`}
            >
              {description}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function WorkspaceStep({
  workspaces,
  search,
  onSearch,
  selectedId,
  onSelect,
}: {
  workspaces: WizardWorkspace[];
  search: string;
  onSearch: (q: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Select a Workspace</h2>
        <p className="text-sm text-gray-500 mt-0.5">Choose the space that fits your needs.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search by name or type…"
          className="w-full pl-9 pr-9 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {search && (
          <button
            onClick={() => onSearch("")}
            className="absolute right-3 top-2 text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        )}
      </div>

      {workspaces.length === 0 ? (
        <p className="text-center text-gray-500 py-10 text-sm">No workspaces match your search.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[340px] overflow-y-auto pr-1">
          {workspaces.map((w) => (
            <button
              key={w.id}
              onClick={() => onSelect(w.id)}
              className={[
                "text-left rounded-xl border-2 overflow-hidden transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                selectedId === w.id
                  ? "border-blue-500 shadow-md"
                  : "border-gray-100 hover:border-gray-300 hover:shadow-sm",
              ].join(" ")}
            >
              <div className="h-24 bg-gradient-to-br from-gray-100 to-gray-200 relative">
                {w.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={w.images[0]} alt={w.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-gray-300" />
                  </div>
                )}
                <span
                  className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                    TYPE_COLORS[w.type] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {TYPE_LABELS[w.type] ?? w.type}
                </span>
                {selectedId === w.id && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shadow-sm">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <div className="p-3 bg-white">
                <h3 className="font-semibold text-gray-900 text-sm truncate">{w.name}</h3>
                {w.description && (
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{w.description}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Users className="w-3 h-3" />
                    {w.availableSeats}/{w.totalSeats} free
                  </span>
                  <span className="text-xs font-bold text-gray-900">
                    {formatNaira(w.hourlyRate)}/hr
                  </span>
                </div>
                {w.amenities && w.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {w.amenities.slice(0, 3).map((a) => (
                      <span
                        key={a}
                        className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                      >
                        {a}
                      </span>
                    ))}
                    {w.amenities.length > 3 && (
                      <span className="text-xs text-gray-400">+{w.amenities.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DateStep({
  availData,
  startDate,
  endDate,
  onStartDate,
  onEndDate,
}: {
  availData: { date: string; availableSeats: number }[];
  startDate: string | null;
  endDate: string | null;
  onStartDate: (d: string) => void;
  onEndDate: (d: string) => void;
}) {
  function handleStart(date: string) {
    onStartDate(date);
    if (endDate && endDate < date) onEndDate(date);
  }

  function handleEnd(date: string) {
    if (startDate && date < startDate) return;
    onEndDate(date);
  }

  const endAvailData = useMemo(
    () => (startDate ? availData.filter((d) => d.date >= startDate) : availData),
    [availData, startDate]
  );

  const nights =
    startDate && endDate ? daysBetween(startDate, endDate) : null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Choose Your Dates</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Select start and end dates for your booking.
        </p>
      </div>

      {(startDate || endDate) && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 rounded-lg">
          <div className="flex-1 text-center">
            <p className="text-xs text-blue-500 font-medium">Start</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">
              {startDate ? formatDateDisplay(startDate) : "—"}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-blue-300 flex-shrink-0" />
          <div className="flex-1 text-center">
            <p className="text-xs text-blue-500 font-medium">End</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">
              {endDate ? formatDateDisplay(endDate) : "—"}
            </p>
          </div>
          {nights !== null && (
            <span className="flex-shrink-0 px-2 py-1 bg-blue-100 rounded text-xs font-medium text-blue-700">
              {nights} day{nights !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-6 items-start">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
            Start Date
          </p>
          <AvailabilityCalendar
            availabilityData={availData}
            selectedDate={startDate ?? undefined}
            onDateSelect={handleStart}
          />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
            End Date
          </p>
          <AvailabilityCalendar
            availabilityData={endAvailData}
            selectedDate={endDate ?? undefined}
            onDateSelect={handleEnd}
          />
        </div>
      </div>
    </div>
  );
}

function SeatStep({
  seats,
  selectedSeat,
  onSelect,
}: {
  seats: SeatInfo[];
  selectedSeat: number | null;
  onSelect: (n: number) => void;
}) {
  const available = seats.filter((s) => s.isAvailable).length;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Select a Seat</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {available} of {seats.length} seat{seats.length !== 1 ? "s" : ""} available.
        </p>
      </div>

      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
        {seats.map((seat) => (
          <button
            key={seat.number}
            disabled={!seat.isAvailable}
            onClick={() => seat.isAvailable && onSelect(seat.number)}
            title={`Seat ${seat.number}${seat.isAvailable ? "" : " (unavailable)"}`}
            className={[
              "aspect-square flex items-center justify-center rounded-lg text-xs font-semibold border-2 transition-all",
              seat.isAvailable
                ? selectedSeat === seat.number
                  ? "bg-blue-600 border-blue-600 text-white shadow-md scale-105"
                  : "bg-green-50 border-green-200 text-green-800 hover:bg-green-100 hover:border-green-400 cursor-pointer"
                : "bg-gray-100 border-gray-100 text-gray-300 cursor-not-allowed",
            ].join(" ")}
          >
            {seat.number}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-green-50 border border-green-300" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-blue-600" />
          Selected
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-gray-100" />
          Unavailable
        </span>
      </div>
    </div>
  );
}

function ReviewStep({
  workspace,
  startDate,
  endDate,
  seatNumber,
  totalDays,
  totalCostKobo,
}: {
  workspace: WizardWorkspace;
  startDate: string;
  endDate: string;
  seatNumber: number;
  totalDays: number;
  totalCostKobo: number;
}) {
  const rows = [
    { label: "Workspace", value: workspace.name },
    { label: "Type", value: TYPE_LABELS[workspace.type] ?? workspace.type },
    { label: "Start Date", value: formatDateDisplay(startDate) },
    { label: "End Date", value: formatDateDisplay(endDate) },
    { label: "Duration", value: `${totalDays} day${totalDays !== 1 ? "s" : ""}` },
    { label: "Seat Number", value: `#${seatNumber}` },
    { label: "Rate", value: `${formatNaira(workspace.hourlyRate)}/hr` },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Review Your Booking</h2>
        <p className="text-sm text-gray-500 mt-0.5">Confirm the details before payment.</p>
      </div>

      <div className="rounded-xl border border-gray-100 overflow-hidden">
        <dl className="bg-white divide-y divide-gray-50">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3">
              <dt className="text-sm text-gray-500">{label}</dt>
              <dd className="text-sm font-medium text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex items-center justify-between px-4 py-4 bg-gray-900 text-white">
          <span className="text-sm font-semibold">Total Cost</span>
          <span className="text-lg font-bold">{formatNaira(totalCostKobo)}</span>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Calculated at 8 hrs/day × {formatNaira(workspace.hourlyRate)}/hr × {totalDays} day
        {totalDays !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

// ---- Main Wizard ----

export default function BookingWizard({
  workspaces,
  availabilityByWorkspace,
  seatsByWorkspace,
  onConfirm,
}: Props) {
  const [step, setStep] = useState(0);
  const [search, setSearch] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [seatNumber, setSeatNumber] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const selectedWorkspace = workspaces.find((w) => w.id === workspaceId) ?? null;
  const seats = workspaceId ? (seatsByWorkspace[workspaceId] ?? []) : [];
  const availData = workspaceId ? (availabilityByWorkspace[workspaceId] ?? []) : [];

  const totalDays = startDate && endDate ? daysBetween(startDate, endDate) : 0;
  const totalCostKobo = selectedWorkspace ? selectedWorkspace.hourlyRate * 8 * totalDays : 0;

  const canNext = useMemo(() => {
    switch (step) {
      case 0: return !!workspaceId;
      case 1: return !!startDate && !!endDate && endDate >= startDate;
      case 2: return seatNumber !== null;
      default: return true;
    }
  }, [step, workspaceId, startDate, endDate, seatNumber]);

  const filteredWorkspaces = useMemo(
    () =>
      workspaces.filter((w) => {
        const q = search.toLowerCase();
        return (
          w.name.toLowerCase().includes(q) ||
          (TYPE_LABELS[w.type] ?? w.type).toLowerCase().includes(q)
        );
      }),
    [workspaces, search]
  );

  function handleSelectWorkspace(id: string) {
    if (id !== workspaceId) {
      setStartDate(null);
      setEndDate(null);
      setSeatNumber(null);
    }
    setWorkspaceId(id);
  }

  function handleConfirm() {
    if (!workspaceId || !startDate || !endDate || seatNumber === null || !selectedWorkspace) return;
    setConfirming(true);
    setTimeout(() => {
      setConfirming(false);
      setConfirmed(true);
      onConfirm?.({
        workspaceId,
        workspaceName: selectedWorkspace.name,
        startDate,
        endDate,
        seatNumber,
        totalCostKobo,
      });
    }, 1200);
  }

  function reset() {
    setConfirmed(false);
    setStep(0);
    setWorkspaceId(null);
    setStartDate(null);
    setEndDate(null);
    setSeatNumber(null);
    setSearch("");
  }

  if (confirmed && selectedWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Booking Confirmed!</h2>
        <p className="text-sm text-gray-500 mb-1">
          Seat{" "}
          <span className="font-medium text-gray-700">#{seatNumber}</span> at{" "}
          <span className="font-medium text-gray-700">{selectedWorkspace.name}</span>
        </p>
        <p className="text-sm text-gray-500 mb-6">
          {startDate && formatDateDisplay(startDate)} →{" "}
          {endDate && formatDateDisplay(endDate)}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          Book Another
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ProgressBar step={step} />

      <div className="min-h-72">
        {step === 0 && (
          <WorkspaceStep
            workspaces={filteredWorkspaces}
            search={search}
            onSearch={setSearch}
            selectedId={workspaceId}
            onSelect={handleSelectWorkspace}
          />
        )}
        {step === 1 && (
          <DateStep
            availData={availData}
            startDate={startDate}
            endDate={endDate}
            onStartDate={setStartDate}
            onEndDate={setEndDate}
          />
        )}
        {step === 2 && (
          <SeatStep seats={seats} selectedSeat={seatNumber} onSelect={setSeatNumber} />
        )}
        {step === 3 && selectedWorkspace && startDate && endDate && seatNumber !== null && (
          <ReviewStep
            workspace={selectedWorkspace}
            startDate={startDate}
            endDate={endDate}
            seatNumber={seatNumber}
            totalDays={totalDays}
            totalCostKobo={totalCostKobo}
          />
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <button
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        {step < 3 ? (
          <button
            disabled={!canNext}
            onClick={() => setStep((s) => s + 1)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            disabled={confirming}
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {confirming ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Confirming…
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Confirm Booking
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
