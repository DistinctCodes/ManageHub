import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WorkspaceRatingForm } from './WorkspaceRatingForm';

const props = { workspaceId: 'w1', bookingId: 'b1', onSubmit: vi.fn() };

describe('WorkspaceRatingForm', () => {
  it('submit button disabled with no score', () => { render(<WorkspaceRatingForm {...props} />); expect(screen.getByText('Submit Review')).toBeDisabled(); });
  it('shows character counter', () => { render(<WorkspaceRatingForm {...props} />); expect(screen.getByText('0 / 500')).toBeInTheDocument(); });
  it('updates counter on input', () => {
    render(<WorkspaceRatingForm {...props} />);
    fireEvent.change(screen.getByPlaceholderText(/comment/i), { target: { value: 'Great!' } });
    expect(screen.getByText('6 / 500')).toBeInTheDocument();
  });
});