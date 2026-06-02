import { checkCapacityThreshold } from './capacity-alert.service';

describe('checkCapacityThreshold', () => {
  it('throws RangeError when capacity <= 0', () => {
    expect(() => checkCapacityThreshold(0, 5)).toThrow(RangeError);
    expect(() => checkCapacityThreshold(-1, 5)).toThrow(RangeError);
  });

  it('computes occupancyPercent = Math.round((activeBookings / capacity) * 100)', () => {
    const result = checkCapacityThreshold(10, 5);
    expect(result.occupancyPercent).toBe(50);
  });

  it('rounds occupancyPercent correctly', () => {
    const result = checkCapacityThreshold(3, 1);
    expect(result.occupancyPercent).toBe(33);
  });

  it('isNearCapacity is true when occupancyPercent >= default threshold of 80', () => {
    const result = checkCapacityThreshold(10, 8);
    expect(result.occupancyPercent).toBe(80);
    expect(result.isNearCapacity).toBe(true);
  });

  it('isNearCapacity is false just below default threshold', () => {
    const result = checkCapacityThreshold(100, 79);
    expect(result.isNearCapacity).toBe(false);
  });

  it('isNearCapacity respects custom thresholdPercent', () => {
    const result = checkCapacityThreshold(10, 5, 50);
    expect(result.isNearCapacity).toBe(true);
  });

  it('isFull is true when activeBookingsCount >= capacity', () => {
    expect(checkCapacityThreshold(10, 10).isFull).toBe(true);
    expect(checkCapacityThreshold(10, 11).isFull).toBe(true);
  });

  it('isFull is false when activeBookingsCount < capacity', () => {
    expect(checkCapacityThreshold(10, 9).isFull).toBe(false);
  });

  it('exports CapacityStatus shape with all 3 fields', () => {
    const result = checkCapacityThreshold(10, 3);
    expect(result).toHaveProperty('occupancyPercent');
    expect(result).toHaveProperty('isNearCapacity');
    expect(result).toHaveProperty('isFull');
  });
});
