import { CompleteBookingProvider } from './complete-booking.provider';
import { BookingStatus } from '../enums/booking-status.enum';

describe('CompleteBookingProvider.complete', () => {
  let bookingsRepository: { findOne: jest.Mock; save: jest.Mock };
  let workspacesService: { adjustAvailableSeats: jest.Mock };
  let provider: CompleteBookingProvider;

  const booking = (overrides: Partial<any> = {}) => ({
    id: 'b-1',
    workspaceId: 'ws-1',
    seatCount: 4,
    status: BookingStatus.CONFIRMED,
    ...overrides,
  });

  beforeEach(() => {
    bookingsRepository = {
      findOne: jest.fn(),
      save: jest.fn((b) => Promise.resolve(b)),
    };
    workspacesService = {
      adjustAvailableSeats: jest.fn().mockResolvedValue(undefined),
    };
    provider = new CompleteBookingProvider(
      bookingsRepository as any,
      workspacesService as any,
    );
  });

  it('frees up the completed booking seat count', async () => {
    bookingsRepository.findOne.mockResolvedValue(booking());

    await provider.complete('b-1');

    expect(workspacesService.adjustAvailableSeats).toHaveBeenCalledWith(
      'ws-1',
      4,
    );
  });

  it('does not adjust seats when the booking is not CONFIRMED', async () => {
    bookingsRepository.findOne.mockResolvedValue(
      booking({ status: BookingStatus.PENDING }),
    );

    await expect(provider.complete('b-1')).rejects.toThrow();

    expect(workspacesService.adjustAvailableSeats).not.toHaveBeenCalled();
  });
});
