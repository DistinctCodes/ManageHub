'use client';

import React, { useEffect, useState } from 'react';

interface AccessLog {
  id: string;
  timestamp: string;
  memberName: string | null;
  deviceName: string;
  method: 'QR' | 'RFID' | 'MANUAL';
  action: 'GRANTED' | 'DENIED';
  denyReason?: string;
}

export default function LogsTab() {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [filterAction, setFilterAction] = useState<string>('ALL');

  const fetchLogs = async () => {
    try {
      const url = filterAction === 'ALL' 
        ? '/api/v1/access-control/logs' 
        : `/api/v1/access-control/logs?action=${filterAction}`;
      const res = await fetch(url);
      const json = await res.json();
      setLogs(json.data || []);
    } catch (err) {
      console.error('Error reading real-time perimeter logs stream:', err);
    }
  };

  // 30-Second Real-Time Heartbeat Polling Loop
  useEffect(() => {
    fetchLogs();
    const pollingInterval = setInterval(fetchLogs, 30000);
    return () => clearInterval(pollingInterval);
  }, [filterAction]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <h2 className="text-xl font-semibold text-slate-800">Perimeter Access Log Ledger</h2>
        
        {/* Dynamic Filters Bar */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter Action:</label>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="border border-slate-300 rounded-lg p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Incidents</option>
            <option value="GRANTED">Access Granted</option>
            <option value="DENIED">Access Denied</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-100 rounded-lg">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <th className="p-4">Timestamp Event</th>
              <th className="p-4">Member Name</th>
              <th className="p-4">Target Reader Terminal</th>
              <th className="p-4">Method Vector</th>
              <th className="p-4">Verification Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 text-slate-500 font-mono text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                <td className="p-4 font-medium text-slate-900">{log.memberName || <span className="text-slate-400 italic">Unknown / Unregistered</span>}</td>
                <td className="p-4 text-slate-600">{log.deviceName}</td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                    {log.method}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-1">
                    <span className={`inline-flex max-w-fit px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      log.action === 'GRANTED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {log.action}
                    </span>
                    {log.action === 'DENIED' && log.denyReason && (
                      <span className="text-xs text-rose-500 max-w-xs truncate" title={log.denyReason}>
                        Reason: {log.denyReason}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}