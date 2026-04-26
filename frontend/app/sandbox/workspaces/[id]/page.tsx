"use client";

import { useState } from "react";

interface Workspace {
  id: string;
  name: string;
  description: string;
  capacity: number;
  pricePerHour: number;
  amenities: string[];
  images: string[];
  available: boolean;
}

const WORKSPACE: Workspace = {
  id: "ws-001",
  name: "The Innovation Hub",
  description:
    "A bright, open workspace designed for collaboration and deep focus. Floor-to-ceiling windows, standing desks, and high-speed fibre make it the perfect home for your team.",
  capacity: 12,
  pricePerHour: 25,
  amenities: ["Wi-Fi", "Whiteboards", "Projector", "Coffee & Tea", "24/7 Access", "Printing"],
  images: [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&q=80",
    "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&q=80",
  ],
  available: true,
};

export default function WorkspaceDetailPage() {
  const [activeImage, setActiveImage] = useState(0);
  const [showBooking, setShowBooking] = useState(false);
  const [hours, setHours] = useState(2);
  const [booked, setBooked] = useState(false);

  const workspace = WORKSPACE;
  const total = workspace.pricePerHour * hours;

  function handleBook() {
    setBooked(true);
    setShowBooking(false);
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Image Gallery */}
      <div className="mb-6">
        <div className="relative w-full h-72 bg-gray-200 rounded-xl overflow-hidden mb-2">
          <img
            src={workspace.images[activeImage]}
            alt={workspace.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex gap-2">
          {workspace.images.map((src, i) => (
            <button
              key={i}
              onClick={() => setActiveImage(i)}
              className={`w-20 h-14 rounded-lg overflow-hidden border-2 ${
                activeImage === i ? "border-blue-500" : "border-transparent"
              }`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">{workspace.name}</h1>
          <p className="text-gray-500 mt-1">Capacity: {workspace.capacity} people</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-blue-600">${workspace.pricePerHour}/hr</p>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              workspace.available
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-600"
            }`}
          >
            {workspace.available ? "Available" : "Unavailable"}
          </span>
        </div>
      </div>

      <p className="text-gray-600 mb-6">{workspace.description}</p>

      {/* Amenities */}
      <div className="mb-6">
        <h2 className="font-semibold mb-2">Amenities</h2>
        <div className="flex flex-wrap gap-2">
          {workspace.amenities.map((a) => (
            <span key={a} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
              {a}
            </span>
          ))}
        </div>
      </div>

      {/* Book button */}
      {booked ? (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 font-medium">
          Booking confirmed! Check your email for details.
        </div>
      ) : (
        <button
          onClick={() => setShowBooking(true)}
          disabled={!workspace.available}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-40"
        >
          Book This Space
        </button>
      )}

      {/* Booking modal */}
      {showBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-lg">
            <h2 className="text-lg font-bold mb-4">Book {workspace.name}</h2>
            <label className="block text-sm font-medium mb-1">Duration (hours)</label>
            <input
              type="number"
              min={1}
              max={8}
              value={hours}
              onChange={(e) => setHours(Math.max(1, Number(e.target.value)))}
              className="w-full border rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-between text-sm mb-6">
              <span className="text-gray-500">Total</span>
              <span className="font-bold">${total}</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBooking(false)}
                className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBook}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
