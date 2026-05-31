import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NotificationDropdown, Notification } from './NotificationDropdown';

const notifications: Notification[] = [
  { id: '1', message: 'Booking confirmed', createdAt: new Date(Date.now() - 7200000), read: false },
  { id: '2', message: 'Payment received', createdAt: new Date(Date.now() - 86400000), read: true },
];

describe('NotificationDropdown', () => {
  it('renders bell button', () => {
    render(<NotificationDropdown notifications={notifications} onMarkAllRead={vi.fn()} onViewAll={vi.fn()} />);
    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
  });

  it('shows unread count badge', () => {
    render(<NotificationDropdown notifications={notifications} onMarkAllRead={vi.fn()} onViewAll={vi.fn()} />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('toggles dropdown on bell click', () => {
    render(<NotificationDropdown notifications={notifications} onMarkAllRead={vi.fn()} onViewAll={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText('Booking confirmed')).toBeInTheDocument();
  });

  it('calls onMarkAllRead when button clicked', () => {
    const onMarkAllRead = vi.fn();
    render(<NotificationDropdown notifications={notifications} onMarkAllRead={onMarkAllRead} onViewAll={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    fireEvent.click(screen.getByText('Mark all read'));
    expect(onMarkAllRead).toHaveBeenCalledTimes(1);
  });

  it('unread notification has distinct background', () => {
    render(<NotificationDropdown notifications={notifications} onMarkAllRead={vi.fn()} onViewAll={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    const unreadItem = screen.getByText('Booking confirmed').closest('li');
    expect(unreadItem?.className).toContain('bg-blue-50');
  });
});