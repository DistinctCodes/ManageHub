"use client";

import { useState } from "react";
import BookingTimeline from "./components/BookingTimeline";
import CancelBookingFlow from "./components/CancelBookingFlow";

const DEMO_BOOKING = {
  id: "BK-1042",
  workspaceName: "The Innovation Hub",
  date: "2024-06-15",
  amount: "$50.00",
};

export default function SandboxPage() {
  const [showCancel, setShowCancel] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-10">
      <h1 className="text-2xl font-bold">Sandbox</h1>

      {/* BookingTimeline demo */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Booking Timeline</h2>
        <BookingTimeline
          currentStatus="Confirmed"
          timestamps={{
            "Created": "2024-06-10 09:00",
            "Payment Received": "2024-06-10 09:05",
            "Confirmed": "2024-06-10 09:10",
          }}
        />
      </section>

      {/* CancelBookingFlow demo */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Cancel Booking Flow</h2>
        {cancelled ? (
          <p className="text-green-600 font-medium">Booking was successfully cancelled.</p>
        ) : (
          <button
            onClick={() => setShowCancel(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Cancel Booking
          </button>
        )}

        {showCancel && (
          <CancelBookingFlow
            booking={DEMO_BOOKING}
            onSuccess={() => { setCancelled(true); setShowCancel(false); }}
            onClose={() => setShowCancel(false)}
          />
        )}
      </section>
    </div>
  );
}
