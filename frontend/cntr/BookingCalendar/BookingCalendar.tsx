import React, { useState, useMemo } from 'react';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface BookingCalendarProps {
  onRangeSelect: (range: DateRange) => void;
  disabledDates?: Date[];
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isBeforeDay(a: Date, b: Date): boolean {
  const aStart = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bStart = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return aStart.getTime() < bStart.getTime();
}

function isBetween(date: Date, start: Date, end: Date): boolean {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return d >= s && d <= e;
}

export const BookingCalendar: React.FC<BookingCalendarProps> = ({
  onRangeSelect,
  disabledDates = [],
}) => {
  const today = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const isDisabled = (date: Date): boolean => {
    if (isBeforeDay(date, today)) return true;
    return disabledDates.some((d) => isSameDay(d, date));
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentYear, currentMonth, day);
    if (isDisabled(clickedDate)) return;

    if (!startDate || endDate) {
      // First click or reset: set start
      setStartDate(clickedDate);
      setEndDate(null);
    } else {
      // Second click: set end
      if (isBeforeDay(clickedDate, startDate)) {
        // If clicked before start, reset
        setStartDate(clickedDate);
        setEndDate(null);
      } else {
        setEndDate(clickedDate);
        onRangeSelect({ start: startDate, end: clickedDate });
      }
    }
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const getDayStyle = (day: number): React.CSSProperties => {
    const date = new Date(currentYear, currentMonth, day);
    const base: React.CSSProperties = {
      width: '36px',
      height: '36px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
    };

    if (isDisabled(date)) {
      return { ...base, backgroundColor: '#e5e7eb', color: '#9ca3af', cursor: 'not-allowed' };
    }

    if (startDate && isSameDay(date, startDate)) {
      return { ...base, backgroundColor: '#3b82f6', color: '#fff' };
    }

    if (endDate && isSameDay(date, endDate)) {
      return { ...base, backgroundColor: '#3b82f6', color: '#fff' };
    }

    if (startDate && endDate && isBetween(date, startDate, endDate)) {
      return { ...base, backgroundColor: '#bfdbfe', color: '#1e3a5f' };
    }

    if (isSameDay(date, today)) {
      return { ...base, backgroundColor: '#fef3c7', color: '#92400e', fontWeight: 700 };
    }

    return { ...base, backgroundColor: '#fff', color: '#111' };
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <div style={{ padding: '16px', maxWidth: '320px' }} data-testid="booking-calendar">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <button type="button" onClick={prevMonth} aria-label="Previous month">&lt;</button>
        <span style={{ fontWeight: 600 }}>{monthNames[currentMonth]} {currentYear}</span>
        <button type="button" onClick={nextMonth} aria-label="Next month">&gt;</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
        {weekDays.map((d) => (
          <div key={d} style={{ fontSize: '12px', fontWeight: 600, padding: '4px' }}>{d}</div>
        ))}

        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = new Date(currentYear, currentMonth, day);
          const disabled = isDisabled(date);

          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              onClick={() => handleDateClick(day)}
              style={getDayStyle(day)}
              aria-label={`${monthNames[currentMonth]} ${day}, ${currentYear}`}
              aria-disabled={disabled}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BookingCalendar;
