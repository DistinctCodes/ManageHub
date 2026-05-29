import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingCalendar } from './BookingCalendar';

describe('BookingCalendar', () => {
  const onRangeSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the calendar with day headers', () => {
    render(<BookingCalendar onRangeSelect={onRangeSelect} />);
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
  });

  it('renders navigation buttons', () => {
    render(<BookingCalendar onRangeSelect={onRangeSelect} />);
    expect(screen.getByLabelText('Previous month')).toBeInTheDocument();
    expect(screen.getByLabelText('Next month')).toBeInTheDocument();
  });

  it('navigates to next month', () => {
    render(<BookingCalendar onRangeSelect={onRangeSelect} />);
    const today = new Date();
    const nextMonthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const expectedMonth = nextMonthNames[(today.getMonth() + 1) % 12];
    fireEvent.click(screen.getByLabelText('Next month'));
    expect(screen.getByText(new RegExp(expectedMonth))).toBeInTheDocument();
  });

  it('past dates are disabled', () => {
    render(<BookingCalendar onRangeSelect={onRangeSelect} />);
    const today = new Date();
    // If today is not the 1st, check that yesterday is disabled
    if (today.getDate() > 1) {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];
      const yesterday = today.getDate() - 1;
      const label = `${monthNames[today.getMonth()]} ${yesterday}, ${today.getFullYear()}`;
      const btn = screen.getByLabelText(label);
      expect(btn).toBeDisabled();
    }
  });

  it('range selection calls onRangeSelect with start and end', () => {
    render(<BookingCalendar onRangeSelect={onRangeSelect} />);
    const today = new Date();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    // Navigate to next month to ensure all dates are available
    fireEvent.click(screen.getByLabelText('Next month'));
    const nextMonth = (today.getMonth() + 1) % 12;
    const nextYear = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();

    const startLabel = `${monthNames[nextMonth]} 5, ${nextYear}`;
    const endLabel = `${monthNames[nextMonth]} 10, ${nextYear}`;

    fireEvent.click(screen.getByLabelText(startLabel));
    fireEvent.click(screen.getByLabelText(endLabel));

    expect(onRangeSelect).toHaveBeenCalledTimes(1);
    const call = onRangeSelect.mock.calls[0][0];
    expect(call.start.getDate()).toBe(5);
    expect(call.end.getDate()).toBe(10);
  });

  it('disabledDates prop disables specific dates', () => {
    const today = new Date();
    const nextMonth = (today.getMonth() + 1) % 12;
    const nextYear = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
    const disabledDate = new Date(nextYear, nextMonth, 15);
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    render(<BookingCalendar onRangeSelect={onRangeSelect} disabledDates={[disabledDate]} />);
    fireEvent.click(screen.getByLabelText('Next month'));

    const label = `${monthNames[nextMonth]} 15, ${nextYear}`;
    const btn = screen.getByLabelText(label);
    expect(btn).toBeDisabled();
  });

  it('clicking a disabled date does not set selection', () => {
    const today = new Date();
    const nextMonth = (today.getMonth() + 1) % 12;
    const nextYear = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
    const disabledDate = new Date(nextYear, nextMonth, 12);
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    render(<BookingCalendar onRangeSelect={onRangeSelect} disabledDates={[disabledDate]} />);
    fireEvent.click(screen.getByLabelText('Next month'));

    const label = `${monthNames[nextMonth]} 12, ${nextYear}`;
    fireEvent.click(screen.getByLabelText(label));
    // Now click another date - since the disabled click was ignored, this is first click (start)
    const otherLabel = `${monthNames[nextMonth]} 13, ${nextYear}`;
    fireEvent.click(screen.getByLabelText(otherLabel));
    // No range should have been selected yet (only start set)
    expect(onRangeSelect).not.toHaveBeenCalled();
  });
});
