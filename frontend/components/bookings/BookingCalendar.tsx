'use client';

import { useState } from 'react';

const BookingCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getMonthData = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = daysInMonth(month, year);
    const weeks = [];
    let day = 1;

    for (let i = 0; i < 6; i++) {
      const week = [];
      for (let j = 0; j < 7; j++) {
        if (i === 0 && j < firstDay) {
          week.push(null);
        } else if (day > totalDays) {
          week.push(null);
        } else {
          week.push(day);
          day++;
        }
      }
      weeks.push(week);
      if (day > totalDays) break;
    }
    return weeks;
  };

  const weeks = getMonthData();

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <button>&lt;</button>
        <h2>
          {currentDate.toLocaleString('default', {
            month: 'long',
            year: 'numeric',
          })}
        </h2>
        <button>&gt;</button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center font-bold">
            {day}
          </div>
        ))}
        {weeks.map((week, i) =>
          week.map((day, j) => (
            <div
              key={`${i}-${j}`}
              className={`p-2 border ${day ? '' : 'bg-gray-100'}`}
            >
              {day}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BookingCalendar;