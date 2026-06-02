import { generateSeatMap } from './seat-map.service';

describe('generateSeatMap', () => {
  it('total seats across all rows equals capacity', () => {
    const map = generateSeatMap(10, 2, []);
    const total = map.rows.reduce((sum, row) => sum + row.seats.length, 0);
    expect(total).toBe(10);
  });

  it('seats are numbered 1 to capacity sequentially', () => {
    const map = generateSeatMap(6, 2, []);
    const allSeats = map.rows.flatMap((r) => r.seats);
    expect(allSeats.map((s) => s.seatNumber)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('isBooked is true for seats in bookedSeatNumbers', () => {
    const map = generateSeatMap(10, 2, [1, 5]);
    const allSeats = map.rows.flatMap((r) => r.seats);
    const seat1 = allSeats.find((s) => s.seatNumber === 1);
    const seat5 = allSeats.find((s) => s.seatNumber === 5);
    expect(seat1?.isBooked).toBe(true);
    expect(seat5?.isBooked).toBe(true);
  });

  it('isBooked is false for unbooked seats', () => {
    const map = generateSeatMap(10, 2, [1, 5]);
    const allSeats = map.rows.flatMap((r) => r.seats);
    const seat2 = allSeats.find((s) => s.seatNumber === 2);
    expect(seat2?.isBooked).toBe(false);
  });

  it('rowIndex values are 0-based sequential', () => {
    const map = generateSeatMap(6, 3, []);
    const indices = map.rows.map((r) => r.rowIndex);
    expect(indices).toEqual([0, 1, 2]);
  });

  it('produces correct number of rows', () => {
    const map = generateSeatMap(10, 2, []);
    expect(map.rows).toHaveLength(2);
  });

  it('works for capacity=6, rows=3, no bookings', () => {
    const map = generateSeatMap(6, 3, []);
    expect(map.rows).toHaveLength(3);
    const total = map.rows.reduce((s, r) => s + r.seats.length, 0);
    expect(total).toBe(6);
    for (const seat of map.rows.flatMap((r) => r.seats)) {
      expect(seat.isBooked).toBe(false);
    }
  });

  it('distributes extra seats to earlier rows when capacity is not divisible by rows', () => {
    const map = generateSeatMap(7, 3, []);
    expect(map.rows[0].seats).toHaveLength(3);
    expect(map.rows[1].seats).toHaveLength(2);
    expect(map.rows[2].seats).toHaveLength(2);
  });
});
