import React from 'react';
import { cn } from '../../lib/utils';
import { BookingStatusBadge, BookingStatus } from '../BookingStatusBadge/BookingStatusBadge';

export interface CheckInLog {
  workspaceName: string;
  checkInTime: string;
  checkOutTime: string | null;
  durationMinutes: number;
  status: string;
}

export interface CheckInHistoryProps extends React.HTMLAttributes<HTMLDivElement> {
  logs: CheckInLog[];
}

function formatDuration(minutes: number): string {
  if (minutes < 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDateString(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, { 
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

export function CheckInHistory({ logs, className, ...props }: CheckInHistoryProps) {
  if (!logs || logs.length === 0) {
    return (
      <div 
        className={cn("p-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg", className)} 
        {...props}
      >
        <p className="text-zinc-500 dark:text-zinc-400">No check-in history available.</p>
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800", className)} {...props}>
      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-sm text-left">
        <thead className="bg-zinc-50 dark:bg-zinc-900/50">
          <tr>
            <th className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-200">Workspace</th>
            <th className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-200">Check-In</th>
            <th className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-200">Check-Out</th>
            <th className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-200">Duration</th>
            <th className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-200">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-950">
          {logs.map((log, i) => (
            <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
              <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                {log.workspaceName}
              </td>
              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                {formatDateString(log.checkInTime)}
              </td>
              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                {log.checkOutTime === null ? (
                  <span className="text-green-600 dark:text-green-500 font-medium">Active</span>
                ) : (
                  formatDateString(log.checkOutTime)
                )}
              </td>
              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                {formatDuration(log.durationMinutes)}
              </td>
              <td className="px-4 py-3">
                <BookingStatusBadge status={log.status as BookingStatus} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
