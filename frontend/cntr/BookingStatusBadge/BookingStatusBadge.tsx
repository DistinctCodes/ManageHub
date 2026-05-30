import React from 'react';
import { cn } from '../../lib/utils'; // Assuming standard shadcn/tailwind setup

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export interface BookingStatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: BookingStatus;
}

const statusConfig: Record<BookingStatus, { label: string; className: string }> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500',
  },
  CONFIRMED: {
    label: 'Confirmed',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-500',
  },
  NO_SHOW: {
    label: 'No Show',
    className: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400',
  },
};

export function BookingStatusBadge({ status, className, ...props }: BookingStatusBadgeProps) {
  const config = statusConfig[status];

  if (!config) {
    return null; // or fallback
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className,
        className
      )}
      {...props}
    >
      {config.label}
    </span>
  );
}
