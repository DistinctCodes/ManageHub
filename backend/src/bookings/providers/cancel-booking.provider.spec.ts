import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CancelBookingProvider } from './cancel-booking.provider';
import { BookingStatus } from '../enums/booking-status.enum';
import { UserRole } from '../../users/enums/userRoles.enum';
import { PaymentStatus } from '../../payments/enums/payment-status.enum';
import { PaymentProvider } from '../../payments/enums/payment-provider.enum';

describe('CancelBookingProvider', () => {
  let provider: CancelBookingProvider;

  const bookingsRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const usersRepository = {
    findOne: jest.fn(),
  };
  const paymentsRepository = {
    findOne: jest.fn(),
  };
  const emailService = {
    sendBookingCancelledEmail: jest.fn().mockResolvedValue(true),
  };
  const workspacesService = {
    findById: jest.fn().mockResolvedValue({ id: 'ws-1', name: 'Lagos Hub' }),
  };
  const configService = {
    get: jest.fn().mockReturnValue(undefined),
  };
  const refundPaymentProvider = {
    refundCore: jest.fn(),
  };

  const pendingBooking = {
    id: 'booking-1',
    userId: 'user-1',
    status: BookingStatus.CONFIRMED,
    startDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  };

  const buildProvider = () =>
    new CancelBookingProvider(
      bookingsRepository as any,
      usersRepository as any,
      paymentsRepository as any,
      emailService as any,
      workspacesService as any,
      configService as any,
      refundPaymentProvider as any,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    configService.get.mockReturnValue(undefined);
    bookingsRepository.save.mockImplementation((b) => Promise.resolve(b));
    usersRepository.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'a@example.com',
      fullName: 'A User',
    });
    provider = buildProvider();
  });

  it('throws NotFoundException for a missing booking', async () => {
    bookingsRepository.findOne.mockResolvedValue(null);
    await expect(
      provider.cancel('missing', 'user-1', UserRole.USER),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('forbids a non-owner, non-admin from cancelling', async () => {
    bookingsRepository.findOne.mockResolvedValue({ ...pendingBooking });
    await expect(
      provider.cancel('booking-1', 'someone-else', UserRole.USER),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects cancelling a booking that is not PENDING/CONFIRMED', async () => {
    bookingsRepository.findOne.mockResolvedValue({
      ...pendingBooking,
      status: BookingStatus.CANCELLED,
    });
    await expect(
      provider.cancel('booking-1', 'user-1', UserRole.USER),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cancels without attempting a refund when there is no SUCCESS payment', async () => {
    bookingsRepository.findOne.mockResolvedValue({ ...pendingBooking });
    paymentsRepository.findOne.mockResolvedValue(null);

    const result = await provider.cancel('booking-1', 'user-1', UserRole.USER);

    expect(result.booking.status).toEqual(BookingStatus.CANCELLED);
    expect(result.refund).toEqual({
      attempted: false,
      refunded: false,
      reason: 'No successful Paystack payment associated with this booking',
    });
    expect(refundPaymentProvider.refundCore).not.toHaveBeenCalled();
  });

  it('auto-refunds when cancelled outside the policy window (>= 24h before start)', async () => {
    bookingsRepository.findOne.mockResolvedValue({ ...pendingBooking }); // starts in 48h
    paymentsRepository.findOne.mockResolvedValue({
      id: 'pay-1',
      status: PaymentStatus.SUCCESS,
      provider: PaymentProvider.PAYSTACK,
    });
    refundPaymentProvider.refundCore.mockResolvedValue({ id: 'pay-1' });

    const result = await provider.cancel('booking-1', 'user-1', UserRole.USER);

    expect(refundPaymentProvider.refundCore).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'pay-1' }),
    );
    expect(result.refund.attempted).toBe(true);
    expect(result.refund.refunded).toBe(true);
  });

  it('cancels without a refund when inside the policy window', async () => {
    bookingsRepository.findOne.mockResolvedValue({
      ...pendingBooking,
      startDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // starts in 2h
    });
    paymentsRepository.findOne.mockResolvedValue({
      id: 'pay-1',
      status: PaymentStatus.SUCCESS,
      provider: PaymentProvider.PAYSTACK,
    });

    const result = await provider.cancel('booking-1', 'user-1', UserRole.USER);

    expect(refundPaymentProvider.refundCore).not.toHaveBeenCalled();
    expect(result.refund.attempted).toBe(true);
    expect(result.refund.refunded).toBe(false);
    expect(result.refund.reason).toMatch(/refund window/);
  });

  it('honours a configured CANCELLATION_REFUND_WINDOW_HOURS', async () => {
    configService.get.mockReturnValue('72');
    bookingsRepository.findOne.mockResolvedValue({ ...pendingBooking }); // starts in 48h < 72h window
    paymentsRepository.findOne.mockResolvedValue({
      id: 'pay-1',
      status: PaymentStatus.SUCCESS,
      provider: PaymentProvider.PAYSTACK,
    });

    const result = await provider.cancel('booking-1', 'user-1', UserRole.USER);

    expect(refundPaymentProvider.refundCore).not.toHaveBeenCalled();
    expect(result.refund.refunded).toBe(false);
  });

  it('still cancels the booking if the automatic refund attempt throws', async () => {
    bookingsRepository.findOne.mockResolvedValue({ ...pendingBooking });
    paymentsRepository.findOne.mockResolvedValue({
      id: 'pay-1',
      status: PaymentStatus.SUCCESS,
      provider: PaymentProvider.PAYSTACK,
    });
    refundPaymentProvider.refundCore.mockRejectedValue(
      new Error('paystack down'),
    );

    const result = await provider.cancel('booking-1', 'user-1', UserRole.USER);

    expect(result.booking.status).toEqual(BookingStatus.CANCELLED);
    expect(result.refund.attempted).toBe(true);
    expect(result.refund.refunded).toBe(false);
  });

  it('allows an admin to cancel someone else’s booking, attributed to "Administrator"', async () => {
    bookingsRepository.findOne.mockResolvedValue({ ...pendingBooking });
    paymentsRepository.findOne.mockResolvedValue(null);

    await provider.cancel('booking-1', 'admin-1', UserRole.ADMIN);
    await Promise.resolve();

    expect(emailService.sendBookingCancelledEmail).toHaveBeenCalledWith(
      'a@example.com',
      'A User',
      expect.objectContaining({ cancelledBy: 'Administrator' }),
    );
  });
});
