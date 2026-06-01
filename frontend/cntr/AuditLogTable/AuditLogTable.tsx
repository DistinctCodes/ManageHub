'use client';
import React from 'react';

export interface AuditLog {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  timestamp: string;
}

interface Props {
  logs: AuditLog[];
  onLoadMore?: () => void;
}

/**
 * Converts an ISO timestamp string to a human-readable relative time string.
 * Uses Intl.RelativeTimeFormat — no external library.
 */
function toRelativeTime(isoString: string): string {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const diffMs = new Date(isoString).getTime() - Date.now();
  const absDiff = Math.abs(diffMs);

  const thresholds: [number, Intl.RelativeTimeFormatUnit][] = [
    [60_000, 'seconds'],
    [3_600_000, 'minutes'],
    [86_400_000, 'hours'],
    [2_592_000_000, 'days'],
    [31_536_000_000, 'months'],
  ];

  for (const [limit, unit] of thresholds) {
    if (absDiff < limit) {
      const prev = thresholds[thresholds.indexOf([limit, unit]) - 1];
      const divisor = prev ? prev[0] : 1000;
      return rtf.format(Math.round(diffMs / divisor), unit);
    }
  }

  return rtf.format(Math.round(diffMs / 31_536_000_000), 'years');
}

export function AuditLogTable({ logs, onLoadMore }: Props) {
  return (
    <div className="w-full">
      <div className="w-full overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Timestamp</th>
              <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Actor</th>
              <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Action</th>
              <th className="px-5 py-3 text-left font-semibold whitespace-nowrap">Resource</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-10 text-center text-gray-400 dark:text-gray-500 italic"
                >
                  No audit logs found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  {/* Timestamp — relative with ISO on hover */}
                  <td
                    className="px-5 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400 tabular-nums"
                    title={log.timestamp}
                  >
                    {toRelativeTime(log.timestamp)}
                  </td>

                  {/* Actor */}
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="font-medium text-gray-800 dark:text-gray-100 truncate max-w-[160px]">
                      {log.actorId}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                      {log.actorRole}
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 ring-1 ring-inset ring-indigo-200 dark:ring-indigo-700">
                      {log.action}
                    </span>
                  </td>

                  {/* Resource — resourceType #resourceId[0..8] */}
                  <td className="px-5 py-3 whitespace-nowrap font-mono text-xs text-gray-600 dark:text-gray-300">
                    {log.resourceType}{' '}
                    <span className="text-gray-400 dark:text-gray-500">
                      #{log.resourceId.slice(0, 8)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {onLoadMore && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={onLoadMore}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
