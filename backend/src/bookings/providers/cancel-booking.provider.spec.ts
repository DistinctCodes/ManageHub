import { CancelBookingProvider } from './cancel-booking.provider';
import { BookingStatus } from '../enums/booking-status.enum';
import { UserRole } from '../../users/enums/userRoles.enum';

describe('CancelBookingProvider.cancel', () => {
  let bookingsRepository: { findOne: jest.Mock; save: jest.Mock };
  let usersRepository: { findOne: jest.Mock };
  let emailService: { sendBookingCancelledEmail: jest.Mock };
  let workspacesService: {
    adjustAvailableSeats: jest.Mock;
    findById: jest.Mock;
  };
  let provider: CancelBookingProvider;

  const booking = (overrides: Partial<any> = {}) => ({
    id: 'b-1',
    userId: 'user-1',
    workspaceId: 'ws-1',
    seatCount: 2,
    status: BookingStatus.CONFIRMED,
    ...overrides,
  });

  beforeEach(() => {
    bookingsRepository = {
      findOne: jest.fn(),
      save: jest.fn((b) => Promise.resolve(b)),
    };
    usersRepository = { findOne: jest.fn().mockResolvedValue(null) };
    emailService = { sendBookingCancelledEmail: jest.fn() };
    workspacesService = {
      adjustAvailableSeats: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(null),
    };
    provider = new CancelBookingProvider(
      bookingsRepository as any,
      usersRepository as any,
      emailService as any,
      workspacesService as any,
    );
  });

  it('frees up exactly the cancelled booking seat count', async () => {
    bookingsRepository.findOne.mockResolvedValue(booking());

    await provider.cancel('b-1', 'user-1', UserRole.USER);

    expect(workspacesService.adjustAvailableSeats).toHaveBeenCalledWith(
      'ws-1',
      2,
    );
  });

  it('does not adjust seats when the booking cannot be cancelled', async () => {
    bookingsRepository.findOne.mockResolvedValue(
      booking({ status: BookingStatus.COMPLETED }),
    );

    await expect(
      provider.cancel('b-1', 'user-1', UserRole.USER),
    ).rejects.toThrow();

    expect(workspacesService.adjustAvailableSeats).not.toHaveBeenCalled();
  });
});
