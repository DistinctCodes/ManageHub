import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AutoCompleteBookingsJob } from './auto-complete-bookings.job';
import { Booking } from '../bookings/entities/booking.entity';
import { BookingStatus } from '../bookings/enums/booking-status.enum';
import { CompleteBookingProvider } from '../bookings/providers/complete-booking.provider';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';

const mockBookingsRepository = {
  find: jest.fn(),
};

const mockCompleteBookingProvider = {
  complete: jest.fn(),
};

const mockNotificationsService = {
  create: jest.fn(),
};

describe('AutoCompleteBookingsJob', () => {
  let job: AutoCompleteBookingsJob;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoCompleteBookingsJob,
        { provide: getRepositoryToken(Booking), useValue: mockBookingsRepository },
        { provide: CompleteBookingProvider, useValue: mockCompleteBookingProvider },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    job = module.get<AutoCompleteBookingsJob>(AutoCompleteBookingsJob);
  });

  it('should be defined', () => {
    expect(job).toBeDefined();
  });

  it('should do nothing when no expired bookings exist', async () => {
    mockBookingsRepository.find.mockResolvedValue([]);
    await job.completeExpiredBookings();
    expect(mockCompleteBookingProvider.complete).not.toHaveBeenCalled();
    expect(mockNotificationsService.create).not.toHaveBeenCalled();
  });

  it('should complete expired bookings and send notifications', async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const expiredBooking: Partial<Booking> = {
      id: 'booking-1',
      userId: 'user-1',
      workspaceId: 'ws-1',
      status: BookingStatus.CONFIRMED,
      endDate: yesterday,
    };

    mockBookingsRepository.find.mockResolvedValue([expiredBooking]);
    mockCompleteBookingProvider.complete.mockResolvedValue({
      ...expiredBooking,
      status: BookingStatus.COMPLETED,
    });
    mockNotificationsService.create.mockResolvedValue({});

    await job.completeExpiredBookings();

    expect(mockCompleteBookingProvider.complete).toHaveBeenCalledWith('booking-1');
    expect(mockNotificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: NotificationType.BOOKING_COMPLETED,
        metadata: expect.objectContaining({ bookingId: 'booking-1' }),
      }),
    );
  });

  it('should skip notification for guest bookings (null userId)', async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const guestBooking: Partial<Booking> = {
      id: 'booking-guest',
      userId: null,
      workspaceId: 'ws-1',
      status: BookingStatus.CONFIRMED,
      endDate: yesterday,
      isGuestBooking: true,
    };

    mockBookingsRepository.find.mockResolvedValue([guestBooking]);
    mockCompleteBookingProvider.complete.mockResolvedValue({});

    await job.completeExpiredBookings();

    expect(mockCompleteBookingProvider.complete).toHaveBeenCalledWith('booking-guest');
    expect(mockNotificationsService.create).not.toHaveBeenCalled();
  });

  it('should continue processing remaining bookings when one fails', async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const bookings: Partial<Booking>[] = [
      { id: 'booking-fail', userId: 'user-1', workspaceId: 'ws-1', status: BookingStatus.CONFIRMED, endDate: yesterday },
      { id: 'booking-ok', userId: 'user-2', workspaceId: 'ws-1', status: BookingStatus.CONFIRMED, endDate: yesterday },
    ];

    mockBookingsRepository.find.mockResolvedValue(bookings);
    mockCompleteBookingProvider.complete
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce({});
    mockNotificationsService.create.mockResolvedValue({});

    await job.completeExpiredBookings();

    expect(mockCompleteBookingProvider.complete).toHaveBeenCalledTimes(2);
    // Only the successful one should have a notification
    expect(mockNotificationsService.create).toHaveBeenCalledTimes(1);
    expect(mockNotificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-2' }),
    );
  });
});