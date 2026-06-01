import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WorkspaceForm } from './WorkspaceForm';

describe('WorkspaceForm', () => {
  it('renders name field', () => { render(<WorkspaceForm onSubmit={vi.fn()} />); expect(screen.getByText('Name')).toBeInTheDocument(); });
  it('renders 6 amenity checkboxes', () => { render(<WorkspaceForm onSubmit={vi.fn()} />); expect(screen.getAllByRole('checkbox')).toHaveLength(6); });
  it('shows loading state when submitting', () => { render(<WorkspaceForm onSubmit={vi.fn()} isSubmitting />); expect(screen.getByText('Saving…')).toBeInTheDocument(); });
  it('pre-populates fields from initialData', () => { render(<WorkspaceForm onSubmit={vi.fn()} initialData={{ name: 'Hub A', capacity: 10, hourlyRateKobo: 50000, amenities: [] }} />); expect((screen.getByDisplayValue('Hub A') as HTMLInputElement).value).toBe('Hub A'); });
});