'use client';

import { useState, useEffect } from 'react';

interface ReportData {
  summary: {
    total: number;
    confirmed: number;
    cancelled: number;
  };
  data: Array<{ period: string; count: number }>;
}

export function ReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [groupBy, setGroupBy] = useState('day');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [from, to, groupBy]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to, groupBy });
      const res = await fetch(`/api/reports/bookings?${params}`);
      const data = await res.json();
      setReport(data);
    } catch (e) {
      console.error('Failed to fetch report:', e);
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    if (!report?.data.length) return;
    const rows = [['Period', 'Count'], ...report.data.map((r) => [r.period, String(r.count)])];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-report-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 flex-wrap">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded px-3 py-2" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded px-3 py-2" />
        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="border rounded px-3 py-2">
          <option value="day">Day</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
        </select>
        <button onClick={exportCsv} className="bg-green-600 text-white px-4 py-2 rounded">Export CSV</button>
      </div>
      {report && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded shadow text-center">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold">{report.summary.total}</p>
          </div>
          <div className="bg-white p-4 rounded shadow text-center">
            <p className="text-sm text-gray-500">Confirmed</p>
            <p className="text-2xl font-bold text-green-600">{report.summary.confirmed}</p>
          </div>
          <div className="bg-white p-4 rounded shadow text-center">
            <p className="text-sm text-gray-500">Cancelled</p>
            <p className="text-2xl font-bold text-red-600">{report.summary.cancelled}</p>
          </div>
        </div>
      )}
      {loading && <p>Loading...</p>}
    </div>
  );
}
