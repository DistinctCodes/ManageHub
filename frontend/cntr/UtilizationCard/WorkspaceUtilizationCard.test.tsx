import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WorkspaceUtilizationCard } from './WorkspaceUtilizationCard';

const stats = { utilizationPercent: 75, totalBookedHours: 120, peakDate: '2024-01-01', quietDate: '2024-01-07' };

describe('WorkspaceUtilizationCard', () => {
  it('renders workspace name', () => { render(<WorkspaceUtilizationCard workspaceName="Hub A" capacity={10} stats={stats} />); expect(screen.getByText(/Hub A/)).toBeInTheDocument(); });
  it('renders utilization percent', () => { render(<WorkspaceUtilizationCard workspaceName="Hub A" capacity={10} stats={stats} />); expect(screen.getByText('75%')).toBeInTheDocument(); });
});