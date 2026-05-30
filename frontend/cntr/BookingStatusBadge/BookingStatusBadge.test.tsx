import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BookingStatusBadge, BookingStatus } from './BookingStatusBadge';

describe('BookingStatusBadge', () => {
  it('renders PENDING status correctly', () => {
    render(<BookingStatusBadge status="PENDING" />);
    const badge = screen.getByText('Pending');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-yellow-100');
    expect(badge.className).toContain('text-yellow-800');
  });

  it('renders CONFIRMED status correctly', () => {
    render(<BookingStatusBadge status="CONFIRMED" />);
    const badge = screen.getByText('Confirmed');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-green-100');
    expect(badge.className).toContain('text-green-800');
  });

  it('renders CANCELLED status correctly', () => {
    render(<BookingStatusBadge status="CANCELLED" />);
    const badge = screen.getByText('Cancelled');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-red-100');
    expect(badge.className).toContain('text-red-800');
  });

  it('renders COMPLETED status correctly', () => {
    render(<BookingStatusBadge status="COMPLETED" />);
    const badge = screen.getByText('Completed');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-blue-100');
    expect(badge.className).toContain('text-blue-800');
  });

  it('renders NO_SHOW status correctly', () => {
    render(<BookingStatusBadge status="NO_SHOW" />);
    const badge = screen.getByText('No Show');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-zinc-100');
    expect(badge.className).toContain('text-zinc-800');
  });

  it('allows passing custom classNames', () => {
    render(<BookingStatusBadge status="CONFIRMED" className="custom-test-class" />);
    const badge = screen.getByText('Confirmed');
    expect(badge.className).toContain('custom-test-class');
  });

  it('returns null for an invalid status', () => {
    const { container } = render(<BookingStatusBadge status={"UNKNOWN" as BookingStatus} />);
    expect(container.firstChild).toBeNull();
  });
});
