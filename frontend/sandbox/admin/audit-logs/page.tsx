"use client";
import { useState } from "react";

const MOCK = Array.from({ length: 60 }, (_, i) => ({
  id: i + 1, timestamp: new Date(Date.now() - i * 3e6).toISOString(),
  actor: `user${i % 5}@hub.com`, action: ["CREATE", "UPDATE", "DELETE", "LOGIN"][i % 4],
  targetType: ["Workspace", "Member", "Booking"][i % 3], targetId: `${100 + i}`,
  details: JSON.stringify({ field: "status", from: "active", to: "inactive", reason: "admin action" }),
}));

const PAGE_SIZE = 25;

export default function AuditLogsPage() {
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<string | null>(null);

  const filtered = MOCK.filter((l) =>
    (!action || l.action === action) &&
    (!from || l.timestamp >= from) &&
    (!to || l.timestamp <= to + "T23:59:59Z")
  );
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Audit Logs</h1>
      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}
          className="border rounded px-3 py-1.5 text-sm">
          <option value="">All Actions</option>
          {["CREATE","UPDATE","DELETE","LOGIN"].map((a) => <option key={a}>{a}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded px-3 py-1.5 text-sm" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded px-3 py-1.5 text-sm" />
      </div>
      {paged.length === 0 ? <p className="text-gray-500 text-center mt-12">No logs match the current filters.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-gray-50 text-left">{["Timestamp","Actor","Action","Target Type","Target ID","Details"].map((h) => <th key={h} className="px-3 py-2 border-b font-medium">{h}</th>)}</tr></thead>
            <tbody>{paged.map((l) => (
              <tr key={l.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap">{new Date(l.timestamp).toLocaleString()}</td>
                <td className="px-3 py-2">{l.actor}</td>
                <td className="px-3 py-2"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">{l.action}</span></td>
                <td className="px-3 py-2">{l.targetType}</td>
                <td className="px-3 py-2">{l.targetId}</td>
                <td className="px-3 py-2 cursor-pointer text-blue-600 hover:underline" onClick={() => setModal(l.details)}>{l.details.slice(0, 30)}…</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <div className="flex gap-2 mt-4 justify-end text-sm">
        <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
        <span className="px-2 py-1">{page} / {totalPages || 1}</span>
        <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
      </div>
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setModal(null)}>
          <div className="bg-white rounded-lg p-6 max-w-lg w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold mb-3">Log Details</h2>
            <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-64">{JSON.stringify(JSON.parse(modal), null, 2)}</pre>
            <button onClick={() => setModal(null)} className="mt-4 px-4 py-1.5 bg-gray-800 text-white rounded text-sm">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
