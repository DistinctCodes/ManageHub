import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CheckInHistory, CheckInLog } from './CheckInHistory';

describe('CheckInHistory', () => {
  const mockLogs: CheckInLog[] = [
    {
      workspaceName: 'Hub A',
      checkInTime: '2026-05-30T10:00:00Z',
      checkOutTime: '2026-05-30T12:15:00Z',
      durationMinutes: 135,
      status: 'COMPLETED',
    },
    {
      workspaceName: 'Hub B',
      checkInTime: '2026-05-31T09:00:00Z',
      checkOutTime: null,
      durationMinutes: 45,
      status: 'CONFIRMED',
    }
  ];

  it('renders a table with all check-in logs', () => {
    render(<CheckInHistory logs={mockLogs} />);
    
    // Check columns
    expect(screen.getByText('Workspace')).toBeInTheDocument();
    expect(screen.getByText('Check-In')).toBeInTheDocument();
    
    // Check data
    expect(screen.getByText('Hub A')).toBeInTheDocument();
    expect(screen.getByText('Hub B')).toBeInTheDocument();
  });

  it('formats duration correctly as Xh Ym', () => {
    render(<CheckInHistory logs={mockLogs} />);
    
    // 135 minutes = 2h 15m
    expect(screen.getByText('2h 15m')).toBeInTheDocument();
    
    // 45 minutes = 45m
    expect(screen.getByText('45m')).toBeInTheDocument();
  });

  it('renders "Active" in green when checkOutTime is null', () => {
    render(<CheckInHistory logs={mockLogs} />);
    
    const activeCell = screen.getByText('Active');
    expect(activeCell).toBeInTheDocument();
    expect(activeCell.className).toContain('text-green-600');
  });

  it('renders the BookingStatusBadge for the status column', () => {
    render(<CheckInHistory logs={mockLogs} />);
    
    // Statuses passed to BookingStatusBadge
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  it('renders an empty state message when logs are empty', () => {
    render(<CheckInHistory logs={[]} />);
    
    expect(screen.getByText('No check-in history available.')).toBeInTheDocument();
    expect(screen.queryByText('Workspace')).not.toBeInTheDocument();
  });

  it('formats zero minutes properly', () => {
    const zeroLog: CheckInLog[] = [{
      workspaceName: 'Hub Zero',
      checkInTime: '2026-05-30T10:00:00Z',
      checkOutTime: '2026-05-30T10:00:00Z',
      durationMinutes: 0,
      status: 'COMPLETED',
    }];
    render(<CheckInHistory logs={zeroLog} />);
    expect(screen.getByText('0m')).toBeInTheDocument();
  });
});
