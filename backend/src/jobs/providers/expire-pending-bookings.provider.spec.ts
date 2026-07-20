import { ConfigService } from '@nestjs/config';
import { ExpirePendingBookingsProvider } from './expire-pending-bookings.provider';
import { BookingStatus } from '../../bookings/enums/booking-status.enum';
import { NotificationType } from '../../notifications/enums/notification-type.enum';

function buildQueryBuilder(result: unknown[]) {
  const qb: Record<string, jest.Mock> = {};
  qb.leftJoinAndSelect = jest.fn().mockReturnValue(qb);
  qb.where = jest.fn().mockReturnValue(qb);
  qb.andWhere = jest.fn((condition) => {
    if (typeof condition === 'function') {
      condition(qb);
    }
    return qb;
  });
  qb.subQuery = jest.fn().mockReturnValue(qb);
  qb.select = jest.fn().mockReturnValue(qb);
  qb.from = jest.fn().mockReturnValue(qb);
  qb.getQuery = jest.fn().mockReturnValue('SELECT 1');
  qb.setParameter = jest.fn().mockReturnValue(qb);
  qb.getMany = jest.fn().mockResolvedValue(result);
  return qb;
}

describe('ExpirePendingBookingsProvider', () => {
  const buildProvider = (bookings: unknown[], ttlEnv?: string) => {
    const bookingsRepository = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValue(buildQueryBuilder(bookings)),
      save: jest.fn().mockImplementation((booking) => Promise.resolve(booking)),
    };
    const configService = {
      get: jest.fn().mockReturnValue(ttlEnv),
    } as unknown as ConfigService;
    const notificationsService = {
      create: jest.fn().mockResolvedValue(undefined),
    };
    const emailService = {
      sendBookingCancelledEmail: jest.fn().mockResolvedValue(true),
    };

    const provider = new ExpirePendingBookingsProvider(
      bookingsRepository as any,
      configService,
      notificationsService as any,
      emailService as any,
    );

    return { provider, bookingsRepository, notificationsService, emailService };
  };

  it('cancels expired PENDING bookings and notifies the user by email and in-app', async () => {
    const booking = {
      id: 'booking-1',
      userId: 'user-1',
      status: BookingStatus.PENDING,
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      user: { email: 'user@example.com', fullName: 'Jane Doe' },
      workspace: { name: 'Lagos Hub' },
    };

    const { provider, bookingsRepository, notificationsService, emailService } =
      buildProvider([booking]);

    await provider.handleExpirePendingBookings();

    expect(booking.status).toBe(BookingStatus.CANCELLED);
    expect(bookingsRepository.save).toHaveBeenCalledWith(booking);
    expect(notificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: NotificationType.BOOKING_CANCELLED,
      }),
    );
    expect(emailService.sendBookingCancelledEmail).toHaveBeenCalledWith(
      'user@example.com',
      'Jane Doe',
      expect.objectContaining({ bookingId: 'booking-1' }),
    );
  });

  it('does nothing when there are no expired bookings', async () => {
    const { provider, bookingsRepository, notificationsService, emailService } =
      buildProvider([]);

    await provider.handleExpirePendingBookings();

    expect(bookingsRepository.save).not.toHaveBeenCalled();
    expect(notificationsService.create).not.toHaveBeenCalled();
    expect(emailService.sendBookingCancelledEmail).not.toHaveBeenCalled();
  });

  it('falls back to the default TTL when the env var is unset', async () => {
    const { provider, bookingsRepository } = buildProvider([], undefined);

    await provider.handleExpirePendingBookings();

    expect(bookingsRepository.createQueryBuilder).toHaveBeenCalledWith(
      'booking',
    );
  });

  it('keeps going and logs an error if expiring one booking fails', async () => {
    const failing = {
      id: 'booking-fail',
      userId: 'user-1',
      status: BookingStatus.PENDING,
      user: { email: 'a@example.com', fullName: 'A' },
      workspace: { name: 'Hub' },
    };
    const ok = {
      id: 'booking-ok',
      userId: 'user-2',
      status: BookingStatus.PENDING,
      user: { email: 'b@example.com', fullName: 'B' },
      workspace: { name: 'Hub' },
    };

    const { provider, bookingsRepository, notificationsService } =
      buildProvider([failing, ok]);
    bookingsRepository.save
      .mockRejectedValueOnce(new Error('db down'))
      .mockImplementationOnce((booking) => Promise.resolve(booking));

    await provider.handleExpirePendingBookings();

    expect(ok.status).toBe(BookingStatus.CANCELLED);
    expect(notificationsService.create).toHaveBeenCalledTimes(1);
  });
});
