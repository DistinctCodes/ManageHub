import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CancelBookingModal } from './CancelBookingModal';

const props = { bookingId: 'b1', workspaceName: 'Hub A', startDate: '2024-06-01', isOpen: true, onConfirm: vi.fn(), onClose: vi.fn() };

describe('CancelBookingModal', () => {
  it('renders when open', () => { render(<CancelBookingModal {...props} />); expect(screen.getByText('Cancel Booking')).toBeInTheDocument(); });
  it('confirm button disabled until reason selected', () => { render(<CancelBookingModal {...props} />); expect(screen.getByText('Confirm Cancel')).toBeDisabled(); });
  it('shows refund note', () => { render(<CancelBookingModal {...props} />); expect(screen.getByText(/24\+ hours/)).toBeInTheDocument(); });
  it('does not render when closed', () => { render(<CancelBookingModal {...props} isOpen={false} />); expect(screen.queryByText('Cancel Booking')).toBeNull(); });
});