import { processBookingReminders, Booking } from './booking-reminder.job';

const now = new Date('2026-06-02T10:00:00Z');
const in12h = new Date('2026-06-02T22:00:00Z');
const in25h = new Date('2026-06-03T11:00:00Z');
const in24h = new Date('2026-06-03T10:00:00Z');

const booking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'bk-1',
  userId: 'u-1',
  workspaceName: 'The Hub',
  startDate: in12h,
  endDate: new Date('2026-06-03T22:00:00Z'),
  status: 'CONFIRMED',
  ...overrides,
});

describe('processBookingReminders', () => {
  let notifyFn: jest.Mock;

  beforeEach(() => {
    notifyFn = jest.fn().mockResolvedValue(undefined);
  });

  it('calls notifyFn for bookings within 24 hours', async () => {
    await processBookingReminders([booking({ startDate: in12h })], notifyFn, now);
    expect(notifyFn).toHaveBeenCalledTimes(1);
  });

  it('does NOT call notifyFn for CANCELLED bookings', async () => {
    await processBookingReminders([booking({ status: 'CANCELLED' })], notifyFn, now);
    expect(notifyFn).not.toHaveBeenCalled();
  });

  it('does NOT call notifyFn for bookings more than 24 hours away', async () => {
    await processBookingReminders([booking({ startDate: in25h })], notifyFn, now);
    expect(notifyFn).not.toHaveBeenCalled();
  });

  it('does NOT call notifyFn for bookings in the past', async () => {
    const past = new Date('2026-06-01T09:00:00Z');
    await processBookingReminders([booking({ startDate: past })], notifyFn, now);
    expect(notifyFn).not.toHaveBeenCalled();
  });

  it('does NOT call notifyFn for booking exactly at the 24h boundary (exclusive)', async () => {
    await processBookingReminders([booking({ startDate: in24h })], notifyFn, now);
    expect(notifyFn).not.toHaveBeenCalled();
  });

  it('message contains workspaceName', async () => {
    await processBookingReminders(
      [booking({ workspaceName: 'Cowork Space Alpha' })],
      notifyFn,
      now,
    );
    expect(notifyFn.mock.calls[0][1]).toContain('Cowork Space Alpha');
  });

  it('message contains the formatted start time', async () => {
    const startDate = new Date('2026-06-02T15:30:00Z');
    await processBookingReminders([booking({ startDate })], notifyFn, now);
    expect(notifyFn.mock.calls[0][1]).toContain(startDate.toISOString());
  });

  it('calls notifyFn with correct userId', async () => {
    await processBookingReminders([booking({ userId: 'user-99' })], notifyFn, now);
    expect(notifyFn.mock.calls[0][0]).toBe('user-99');
  });

  it('processes multiple eligible bookings', async () => {
    const bookings = [
      booking({ id: 'bk-1', startDate: in12h }),
      booking({ id: 'bk-2', startDate: in12h }),
    ];
    await processBookingReminders(bookings, notifyFn, now);
    expect(notifyFn).toHaveBeenCalledTimes(2);
  });
});
