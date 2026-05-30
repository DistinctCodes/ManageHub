import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OccupancyPieChart } from './OccupancyPieChart';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
    Pie: () => null,
    Cell: () => null,
    Tooltip: () => null,
    Legend: () => <div data-testid="legend" />,
  };
});

const mockData = [
  { workspaceName: 'Alpha', occupancyPercent: 80 },
  { workspaceName: 'Beta', occupancyPercent: 50 },
];

describe('OccupancyPieChart', () => {
  it('renders the pie chart container', () => {
    render(<OccupancyPieChart data={mockData} />);
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('renders the legend', () => {
    render(<OccupancyPieChart data={mockData} />);
    expect(screen.getByTestId('legend')).toBeInTheDocument();
  });
});