'use client';

import { useState } from 'react';

export default function KioskPage() {
  const [checkInData, setCheckInData] = useState<any[]>([]);
  const [memberName, setMemberName] = useState('');

  const handleCheckIn = () => {
    if (memberName) {
      setCheckInData([...checkInData, { id: Date.now(), name: memberName, time: new Date(), type: 'check-in' }]);
      setMemberName('');
    }
  };

  const handleCheckOut = () => {
    if (memberName) {
      setCheckInData([...checkInData, { id: Date.now(), name: memberName, time: new Date(), type: 'check-out' }]);
      setMemberName('');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-4xl font-bold text-center mb-8">Welcome</h1>

        <div className="mb-6">
          <input type="text" placeholder="Enter your name" value={memberName} onChange={(e) => setMemberName(e.target.value)} className="border-2 border-blue-500 p-4 w-full rounded text-lg" />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <button onClick={handleCheckIn} className="bg-green-600 text-white py-4 rounded-lg text-lg font-bold hover:bg-green-700">Check In</button>
          <button onClick={handleCheckOut} className="bg-red-600 text-white py-4 rounded-lg text-lg font-bold hover:bg-red-700">Check Out</button>
        </div>

        <div className="border-t pt-4">
          <p className="text-sm text-gray-600 text-center">Recent Activity</p>
          <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
            {checkInData.slice(-5).reverse().map((entry) => (
              <div key={entry.id} className="text-xs text-gray-700 p-2 bg-gray-100 rounded">
                {entry.name} - {entry.type} at {entry.time.toLocaleTimeString()}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
