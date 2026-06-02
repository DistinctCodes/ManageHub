export interface OpeningHoursEntry {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateOpeningHours(hours: OpeningHoursEntry[]): ValidationResult {
  const errors: string[] = [];
  const seenDays = new Set<number>();

  for (const entry of hours) {
    const day = entry.dayOfWeek;

    if (seenDays.has(day)) {
      errors.push(`Duplicate dayOfWeek: ${day}`);
    } else {
      seenDays.add(day);
    }

    if (!TIME_REGEX.test(entry.openTime)) {
      errors.push(`Invalid openTime format for day ${day}: "${entry.openTime}" (expected HH:MM)`);
    }

    if (!TIME_REGEX.test(entry.closeTime)) {
      errors.push(`Invalid closeTime format for day ${day}: "${entry.closeTime}" (expected HH:MM)`);
    }

    if (
      !entry.isClosed &&
      TIME_REGEX.test(entry.openTime) &&
      TIME_REGEX.test(entry.closeTime) &&
      entry.closeTime <= entry.openTime
    ) {
      errors.push(`closeTime must be after openTime for day ${day}: ${entry.openTime} → ${entry.closeTime}`);
    }
  }

  return { isValid: errors.length === 0, errors };
}
