import { validateOpeningHours, OpeningHoursEntry } from './opening-hours.validator';

const entry = (overrides: Partial<OpeningHoursEntry> = {}): OpeningHoursEntry => ({
  dayOfWeek: 1,
  openTime: '09:00',
  closeTime: '17:00',
  isClosed: false,
  ...overrides,
});

describe('validateOpeningHours', () => {
  it('returns valid for a correct single entry', () => {
    const result = validateOpeningHours([entry()]);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects openTime with invalid format', () => {
    const result = validateOpeningHours([entry({ openTime: '9:00' })]);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('openTime'))).toBe(true);
  });

  it('rejects closeTime with invalid format', () => {
    const result = validateOpeningHours([entry({ closeTime: '17:60' })]);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('closeTime'))).toBe(true);
  });

  it('rejects closeTime equal to openTime when not closed', () => {
    const result = validateOpeningHours([entry({ openTime: '09:00', closeTime: '09:00' })]);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('closeTime must be after'))).toBe(true);
  });

  it('rejects closeTime before openTime when not closed', () => {
    const result = validateOpeningHours([entry({ openTime: '17:00', closeTime: '09:00' })]);
    expect(result.isValid).toBe(false);
  });

  it('allows closeTime before openTime when isClosed is true', () => {
    const result = validateOpeningHours([entry({ openTime: '17:00', closeTime: '09:00', isClosed: true })]);
    expect(result.isValid).toBe(true);
  });

  it('rejects duplicate dayOfWeek entries', () => {
    const result = validateOpeningHours([
      entry({ dayOfWeek: 1 }),
      entry({ dayOfWeek: 1 }),
    ]);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('Duplicate dayOfWeek'))).toBe(true);
  });

  it('collects ALL errors at once (no fail-fast)', () => {
    const result = validateOpeningHours([
      entry({ dayOfWeek: 0, openTime: 'bad', closeTime: 'also-bad' }),
      entry({ dayOfWeek: 0, openTime: '17:00', closeTime: '09:00' }),
    ]);
    expect(result.errors.length).toBeGreaterThan(2);
  });

  it('returns valid for a full week of correct entries', () => {
    const week: OpeningHoursEntry[] = [0, 1, 2, 3, 4, 5, 6].map(day => ({
      dayOfWeek: day as OpeningHoursEntry['dayOfWeek'],
      openTime: '08:00',
      closeTime: '20:00',
      isClosed: day === 0,
    }));
    const result = validateOpeningHours(week);
    expect(result.isValid).toBe(true);
  });

  it('returns valid for an empty array', () => {
    const result = validateOpeningHours([]);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
