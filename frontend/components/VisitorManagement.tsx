'use client';

import { useState } from 'react';

export default function VisitorManagement() {
  const [visitors, setVisitors] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [host, setHost] = useState('');

  const handleRegisterVisitor = () => {
    if (name && host) {
      setVisitors([...visitors, { id: Date.now(), name, host, status: 'checked-in', checkInTime: new Date() }]);
      setName('');
      setHost('');
    }
  };

  const handleCheckOut = (id: number) => {
    setVisitors(visitors.map(v => v.id === id ? { ...v, status: 'checked-out' } : v));
  };

  return (
    <div className="p-4 border rounded-lg">
      <h2 className="text-xl font-bold mb-4">Visitor Management</h2>

      <div className="bg-white rounded p-3 mb-4 space-y-2">
        <input type="text" placeholder="Visitor name" value={name} onChange={(e) => setName(e.target.value)} className="border p-2 w-full rounded" />
        <input type="text" placeholder="Host name" value={host} onChange={(e) => setHost(e.target.value)} className="border p-2 w-full rounded" />
        <button onClick={handleRegisterVisitor} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full">Register Visitor</button>
      </div>

      <div className="space-y-2">
        {visitors.map((visitor) => (
          <div key={visitor.id} className="border rounded p-3 flex justify-between items-center bg-gray-50">
            <div>
              <p className="font-semibold">{visitor.name}</p>
              <p className="text-sm text-gray-600">Host: {visitor.host}</p>
            </div>
            <button onClick={() => handleCheckOut(visitor.id)} className={`px-3 py-1 rounded text-sm ${visitor.status === 'checked-out' ? 'bg-gray-300 text-gray-700' : 'bg-orange-500 text-white hover:bg-orange-600'}`}>
              {visitor.status === 'checked-out' ? 'Checked Out' : 'Check Out'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
