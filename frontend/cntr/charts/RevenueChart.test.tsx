import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RevenueChart } from './RevenueChart';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

const mockData = [
  { month: 'Jan', revenueKobo: 5000000 },
  { month: 'Feb', revenueKobo: 7500000 },
];

describe('RevenueChart', () => {
  it('renders without crashing', () => {
    render(<RevenueChart data={mockData} />);
  });

  it('renders with empty data', () => {
    render(<RevenueChart data={[]} />);
  });
});