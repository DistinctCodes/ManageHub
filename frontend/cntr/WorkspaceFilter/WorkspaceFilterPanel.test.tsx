import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WorkspaceFilterPanel } from './WorkspaceFilterPanel';

describe('WorkspaceFilterPanel', () => {
  it('renders search input', () => { render(<WorkspaceFilterPanel onFilterChange={vi.fn()} />); expect(screen.getByPlaceholderText(/Search/)).toBeInTheDocument(); });
  it('renders 6 amenity checkboxes', () => { render(<WorkspaceFilterPanel onFilterChange={vi.fn()} />); expect(screen.getAllByRole('checkbox')).toHaveLength(6); });
  it('clear all resets search', () => {
    render(<WorkspaceFilterPanel onFilterChange={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Search/), { target: { value: 'test' } });
    fireEvent.click(screen.getByText('Clear all'));
    expect((screen.getByPlaceholderText(/Search/) as HTMLInputElement).value).toBe('');
  });
});