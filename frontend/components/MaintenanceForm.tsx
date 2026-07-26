'use client';

import { useState } from 'react';

export default function MaintenanceForm() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title && description) {
      setTickets([...tickets, { id: Date.now(), title, description, priority, status: 'open', createdAt: new Date() }]);
      setTitle('');
      setDescription('');
      setPriority('medium');
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white">
      <h3 className="text-lg font-bold mb-4">Report Maintenance Issue</h3>

      <form onSubmit={handleSubmit} className="space-y-3 mb-6">
        <div>
          <input type="text" placeholder="Issue Title" value={title} onChange={(e) => setTitle(e.target.value)} className="border p-2 w-full rounded" />
        </div>

        <div>
          <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="border p-2 w-full rounded" rows={3} />
        </div>

        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="border p-2 w-full rounded">
          <option value="low">Low Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="high">High Priority</option>
        </select>

        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          Submit Report
        </button>
      </form>

      <div className="space-y-2">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="border rounded p-3 bg-gray-50">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="font-semibold">{ticket.title}</p>
                <p className="text-sm text-gray-600">{ticket.description}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${ticket.priority === 'high' ? 'bg-red-100 text-red-800' : ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                {ticket.priority}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
