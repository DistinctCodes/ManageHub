import React from 'react';

export interface Seat {
  seatNumber: number;
  isBooked: boolean;
}

export interface SeatMapProps {
  seats: Seat[];
  selectedSeat?: number;
  onSeatSelect: (seatNumber: number) => void;
}

export const SeatMap: React.FC<SeatMapProps> = ({ seats, selectedSeat, onSeatSelect }) => {
  const getStatus = (seat: Seat): 'available' | 'booked' | 'selected' => {
    if (selectedSeat === seat.seatNumber) return 'selected';
    if (seat.isBooked) return 'booked';
    return 'available';
  };

  const colorMap: Record<string, string> = {
    available: '#22c55e',
    booked: '#ef4444',
    selected: '#3b82f6',
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))',
        gap: '8px',
        padding: '16px',
      }}
      role="group"
      aria-label="Workspace Seat Map"
    >
      {seats.map((seat) => {
        const status = getStatus(seat);
        const label = `Seat ${seat.seatNumber} - ${seat.isBooked ? 'Booked' : 'Available'}`;

        return (
          <button
            key={seat.seatNumber}
            type="button"
            aria-label={label}
            disabled={seat.isBooked}
            onClick={() => {
              if (!seat.isBooked) {
                onSeatSelect(seat.seatNumber);
              }
            }}
            style={{
              width: '48px',
              height: '48px',
              backgroundColor: colorMap[status],
              border: 'none',
              borderRadius: '6px',
              cursor: seat.isBooked ? 'not-allowed' : 'pointer',
              color: '#fff',
              fontWeight: 600,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {seat.seatNumber}
          </button>
        );
      })}
    </div>
  );
};

export default SeatMap;
