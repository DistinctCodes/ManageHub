export interface Seat {
  seatNumber: number;
  isBooked: boolean;
}

export interface SeatRow {
  rowIndex: number;
  seats: Seat[];
}

export interface SeatMap {
  rows: SeatRow[];
}

export function generateSeatMap(
  capacity: number,
  rows: number,
  bookedSeatNumbers: number[],
): SeatMap {
  const booked = new Set(bookedSeatNumbers);
  const seatsPerRow = Math.floor(capacity / rows);
  const extraSeats = capacity % rows;

  const seatRows: SeatRow[] = [];
  let seatNumber = 1;

  for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
    const count = seatsPerRow + (rowIndex < extraSeats ? 1 : 0);
    const seats: Seat[] = [];
    for (let i = 0; i < count; i++) {
      seats.push({ seatNumber, isBooked: booked.has(seatNumber) });
      seatNumber++;
    }
    seatRows.push({ rowIndex, seats });
  }

  return { rows: seatRows };
}
