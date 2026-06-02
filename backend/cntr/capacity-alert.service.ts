export interface CapacityStatus {
  occupancyPercent: number;
  isNearCapacity: boolean;
  isFull: boolean;
}

export function checkCapacityThreshold(
  capacity: number,
  activeBookingsCount: number,
  thresholdPercent = 80,
): CapacityStatus {
  if (capacity <= 0) {
    throw new RangeError(`capacity must be > 0, got: ${capacity}`);
  }
  const occupancyPercent = Math.round((activeBookingsCount / capacity) * 100);
  return {
    occupancyPercent,
    isNearCapacity: occupancyPercent >= thresholdPercent,
    isFull: activeBookingsCount >= capacity,
  };
}
