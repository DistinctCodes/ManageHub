'use client';

import React, { useEffect, useState } from 'react';

interface Device {
  id: string;
  name: string;
  type: 'QR_READER' | 'RFID' | 'SMART_LOCK';
  location: string;
  status: 'ONLINE' | 'OFFLINE';
  lastSeen: string;
  hardwareId: string;
}

export default function DevicesTab() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'QR_READER', location: 'Main Entrance', hardwareId: '' });

  const fetchDevices = async () => {
    try {
      const res = await fetch('/api/v1/access-control/devices');
      const json = await res.json();
      setDevices(json.data || []);
    } catch (err) {
      console.error('Failed to resolve hardware registration collections:', err);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/v1/access-control/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      setIsModalOpen(false);
      setFormData({ name: '', type: 'QR_READER', location: 'Main Entrance', hardwareId: '' });
      fetchDevices();
    } catch (err) {
      console.error('Error recording hardware registration profile:', err);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Hardware Peripherals Directory</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow transition-colors"
        >
          Register Access Device
        </button>
      </div>

      <div className="overflow-x-auto border border-slate-100 rounded-lg">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <th className="p-4">Device Name</th>
              <th className="p-4">Type Identifier</th>
              <th className="p-4">Location Zone</th>
              <th className="p-4">Telemetry Status</th>
              <th className="p-4">Last Active Heartbeat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {devices.map((device) => (
              <tr key={device.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 font-medium text-slate-900">{device.name}</td>
                <td className="p-4">
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                    {device.type.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-4 text-slate-600">{device.location}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    device.status === 'ONLINE'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${device.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {device.status}
                  </span>
                </td>
                <td className="p-4 text-slate-500">{new Date(device.lastSeen).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Registration Modal Overlay Component */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-100 overflow-hidden p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Register New Reader Node</h3>
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Device Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., South Turnstile Core"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Reader Mechanism Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="QR_READER">QR Code Canvas Reader</option>
                  <option value="RFID">RFID Proximity Scanner</option>
                  <option value="SMART_LOCK">Smart Lock Bolt Actuator</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Hardware MAC/ID Footprint</label>
                <input
                  type="text"
                  required
                  value={formData.hardwareId}
                  onChange={(e) => setFormData({ ...formData, hardwareId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., HW-FLX-00921"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow transition-colors"
                >
                  Provision Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}