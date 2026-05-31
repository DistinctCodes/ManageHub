import React, { useRef, useState, useEffect } from 'react';
import { Bell } from 'lucide-react';

export interface Notification {
  id: string;
  message: string;
  createdAt: Date;
  read: boolean;
  icon?: React.ReactNode;
}

interface Props {
  notifications: Notification[];
  onMarkAllRead: () => void;
  onViewAll: () => void;
}

function relativeTime(date: Date): string {
  const diff = (date.getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  return rtf.format(Math.round(diff / 86400), 'day');
}

export const NotificationDropdown: React.FC<Props> = ({ notifications, onMarkAllRead, onViewAll }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const visible = notifications.slice(0, 10);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <span className="font-semibold text-sm">Notifications</span>
            <button onClick={onMarkAllRead} className="text-xs text-blue-600 hover:underline">
              Mark all read
            </button>
          </div>
          <ul className="max-h-72 overflow-y-auto divide-y">
            {visible.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-gray-400">No notifications</li>
            )}
            {visible.map((n) => (
              <li
                key={n.id}
                className={`flex gap-3 px-4 py-3 text-sm ${n.read ? 'bg-white' : 'bg-blue-50'}`}
              >
                {n.icon && <span className="mt-0.5 shrink-0">{n.icon}</span>}
                <div className="flex-1 min-w-0">
                  <p className="truncate">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{relativeTime(n.createdAt)}</p>
                </div>
                {!n.read && <span className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 shrink-0" aria-label="Unread" />}
              </li>
            ))}
          </ul>
          <div className="px-4 py-2 border-t text-center">
            <button onClick={onViewAll} className="text-xs text-blue-600 hover:underline">
              View all
            </button>
          </div>
        </div>
      )}
    </div>
  );
};