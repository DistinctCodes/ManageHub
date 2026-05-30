import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BookingTrendsChart } from './BookingTrendsChart';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

const mockData = [
  { date: '2024-01-01', bookings: 10, cancellations: 2 },
  { date: '2024-01-02', bookings: 15, cancellations: 3 },
];

describe('BookingTrendsChart', () => {
  it('renders skeleton when data is empty', () => {
    render(<BookingTrendsChart data={[]} period="week" />);
    expect(screen.getByText(/loading chart data/i)).toBeInTheDocument();
  });

  it('renders chart when data is provided', () => {
    render(<BookingTrendsChart data={mockData} period="week" />);
    expect(screen.queryByText(/loading chart data/i)).not.toBeInTheDocument();
  });
});