import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SeatMap, Seat } from './SeatMap';

const mockSeats: Seat[] = [
  { seatNumber: 1, isBooked: false },
  { seatNumber: 2, isBooked: true },
  { seatNumber: 3, isBooked: false },
  { seatNumber: 4, isBooked: false },
  { seatNumber: 5, isBooked: true },
];

describe('SeatMap', () => {
  it('renders one button per seat', () => {
    const onSeatSelect = vi.fn();
    render(<SeatMap seats={mockSeats} onSeatSelect={onSeatSelect} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(5);
  });

  it('available seats have green background', () => {
    const onSeatSelect = vi.fn();
    render(<SeatMap seats={mockSeats} onSeatSelect={onSeatSelect} />);
    const seat1 = screen.getByLabelText('Seat 1 - Available');
    expect(seat1).toHaveStyle({ backgroundColor: '#22c55e' });
  });

  it('booked seats have red background', () => {
    const onSeatSelect = vi.fn();
    render(<SeatMap seats={mockSeats} onSeatSelect={onSeatSelect} />);
    const seat2 = screen.getByLabelText('Seat 2 - Booked');
    expect(seat2).toHaveStyle({ backgroundColor: '#ef4444' });
  });

  it('selected seat has blue background', () => {
    const onSeatSelect = vi.fn();
    render(<SeatMap seats={mockSeats} selectedSeat={1} onSeatSelect={onSeatSelect} />);
    const seat1 = screen.getByLabelText('Seat 1 - Available');
    expect(seat1).toHaveStyle({ backgroundColor: '#3b82f6' });
  });

  it('clicking an available seat calls onSeatSelect', () => {
    const onSeatSelect = vi.fn();
    render(<SeatMap seats={mockSeats} onSeatSelect={onSeatSelect} />);
    const seat3 = screen.getByLabelText('Seat 3 - Available');
    fireEvent.click(seat3);
    expect(onSeatSelect).toHaveBeenCalledWith(3);
  });

  it('clicking a booked seat does not call onSeatSelect', () => {
    const onSeatSelect = vi.fn();
    render(<SeatMap seats={mockSeats} onSeatSelect={onSeatSelect} />);
    const seat2 = screen.getByLabelText('Seat 2 - Booked');
    fireEvent.click(seat2);
    expect(onSeatSelect).not.toHaveBeenCalled();
  });

  it('each seat has correct aria-label', () => {
    const onSeatSelect = vi.fn();
    render(<SeatMap seats={mockSeats} onSeatSelect={onSeatSelect} />);
    expect(screen.getByLabelText('Seat 1 - Available')).toBeInTheDocument();
    expect(screen.getByLabelText('Seat 2 - Booked')).toBeInTheDocument();
    expect(screen.getByLabelText('Seat 3 - Available')).toBeInTheDocument();
    expect(screen.getByLabelText('Seat 5 - Booked')).toBeInTheDocument();
  });

  it('booked seats are disabled', () => {
    const onSeatSelect = vi.fn();
    render(<SeatMap seats={mockSeats} onSeatSelect={onSeatSelect} />);
    const seat2 = screen.getByLabelText('Seat 2 - Booked');
    expect(seat2).toBeDisabled();
  });
});
