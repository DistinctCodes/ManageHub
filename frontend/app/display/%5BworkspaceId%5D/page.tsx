'use client';

import { useState } from 'react';

interface Booking {
  id: string;
  time: string;
  member: string;
  room: string;
  status: 'current' | 'next';
}

export default function RoomDisplayPage({ params }: { params: { workspaceId: string } }) {
  const [bookings] = useState<Booking[]>([
    { id: '1', time: '10:00 AM - 11:30 AM', member: 'John Doe', room: 'Meeting Room A', status: 'current' },
    { id: '2', time: '11:45 AM - 1:00 PM', member: 'Jane Smith', room: 'Meeting Room A', status: 'next' },
  ]);

  const currentBooking = bookings.find((b) => b.status === 'current');
  const nextBooking = bookings.find((b) => b.status === 'next');

  return (
    <div className="w-full h-screen bg-gradient-to-b from-blue-600 to-blue-800 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        <h1 className="text-4xl font-bold text-white text-center mb-8">Room Status</h1>

        {currentBooking && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <p className="text-gray-600 text-sm uppercase tracking-wide">Currently In Use</p>
            <p className="text-3xl font-bold text-blue-600 mb-2">{currentBooking.room}</p>
            <p className="text-lg font-semibold text-gray-800">{currentBooking.member}</p>
            <p className="text-gray-600">{currentBooking.time}</p>
          </div>
        )}

        {nextBooking && (
          <div className="bg-white rounded-lg shadow-lg p-6 opacity-75">
            <p className="text-gray-600 text-sm uppercase tracking-wide">Next Booking</p>
            <p className="text-2xl font-bold text-gray-800 mb-2">{nextBooking.member}</p>
            <p className="text-gray-600">{nextBooking.time}</p>
          </div>
        )}
      </div>
    </div>
  );
}
