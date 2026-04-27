"use client";

import { useState } from "react";
import BookingWizard, {
  type WizardBooking,
  type WizardWorkspace,
  type SeatInfo,
} from "./BookingWizard";

const today = new Date();

function isoDate(offsetDays: number) {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

const WORKSPACES: WizardWorkspace[] = [
  {
    id: "ws-1",
    name: "The Hive",
    type: "HOT_DESK",
    totalSeats: 20,
    availableSeats: 14,
    hourlyRate: 50000,
    description: "A vibrant open coworking space with fast WiFi and a coffee bar.",
    amenities: ["WiFi", "Coffee", "Printing", "Locker"],
  },
  {
    id: "ws-2",
    name: "Focus Pod",
    type: "PRIVATE_OFFICE",
    totalSeats: 4,
    availableSeats: 2,
    hourlyRate: 200000,
    description: "Private office suite for deep focus sessions away from the noise.",
    amenities: ["WiFi", "AC", "Whiteboard", "Parking"],
  },
  {
    id: "ws-3",
    name: "Collab Room",
    type: "MEETING_ROOM",
    totalSeats: 12,
    availableSeats: 8,
    hourlyRate: 150000,
    description: "Modern meeting room with projector and video conferencing setup.",
    amenities: ["Projector", "WiFi", "AC", "Coffee"],
  },
  {
    id: "ws-4",
    name: "Quiet Zone",
    type: "DEDICATED_DESK",
    totalSeats: 8,
    availableSeats: 5,
    hourlyRate: 75000,
    description: "Dedicated desks in a serene, low-noise environment.",
    amenities: ["WiFi", "AC", "Locker"],
  },
  {
    id: "ws-5",
    name: "The Workshop",
    type: "COWORKING",
    totalSeats: 30,
    availableSeats: 22,
    hourlyRate: 40000,
    description: "Open coworking floor with standing desks and breakout zones.",
    amenities: ["WiFi", "Coffee", "AC", "Printing", "Whiteboard"],
  },
];

function makeAvailData(totalSeats: number, seed: number) {
  return Array.from({ length: 30 }, (_, i) => ({
    date: isoDate(i),
    availableSeats: Math.max(
      0,
      Math.floor(((Math.sin(i * seed + 1) + 1) / 2) * totalSeats)
    ),
  }));
}

function makeSeats(total: number, seed: number): SeatInfo[] {
  return Array.from({ length: total }, (_, i) => ({
    number: i + 1,
    isAvailable: Math.sin(i * seed + 2) > -0.3,
  }));
}

const AVAILABILITY_BY_WORKSPACE = {
  "ws-1": makeAvailData(20, 1.3),
  "ws-2": makeAvailData(4, 2.1),
  "ws-3": makeAvailData(12, 0.7),
  "ws-4": makeAvailData(8, 1.9),
  "ws-5": makeAvailData(30, 0.5),
};

const SEATS_BY_WORKSPACE = {
  "ws-1": makeSeats(20, 1.7),
  "ws-2": makeSeats(4, 3.1),
  "ws-3": makeSeats(12, 2.3),
  "ws-4": makeSeats(8, 1.1),
  "ws-5": makeSeats(30, 0.9),
};

export function BookingWizardDemo() {
  const [lastBooking, setLastBooking] = useState<WizardBooking | null>(null);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <BookingWizard
          workspaces={WORKSPACES}
          availabilityByWorkspace={AVAILABILITY_BY_WORKSPACE}
          seatsByWorkspace={SEATS_BY_WORKSPACE}
          onConfirm={setLastBooking}
        />
      </div>

      {lastBooking && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-sm font-semibold text-green-800 mb-1">Last Confirmed Booking</p>
          <p className="text-xs text-green-700">
            <span className="font-medium">{lastBooking.workspaceName}</span>
            {" · "}Seat #{lastBooking.seatNumber}
            {" · "}
            {lastBooking.startDate} → {lastBooking.endDate}
          </p>
        </div>
      )}
    </div>
  );
}
