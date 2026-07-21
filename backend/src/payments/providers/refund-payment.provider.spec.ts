import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RefundPaymentProvider } from './refund-payment.provider';
import { PaymentStatus } from '../enums/payment-status.enum';
import { UserRole } from '../../users/enums/userRoles.enum';
import { BookingStatus } from '../../bookings/enums/booking-status.enum';
import { NotificationType } from '../../notifications/enums/notification-type.enum';

describe('RefundPaymentProvider', () => {
  let provider: RefundPaymentProvider;

  const paymentsRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const usersRepository = {
    findOne: jest.fn(),
  };
  const paystackProvider = {
    initiateRefund: jest.fn(),
  };
  const bookingsService = {
    findById: jest.fn(),
    cancel: jest.fn(),
  };
  const emailService = {
    sendPaymentRefundedEmail: jest.fn().mockResolvedValue(true),
  };
  const notificationsService = {
    create: jest.fn().mockResolvedValue(undefined),
  };

  const successPayment = {
    id: 'pay-1',
    bookingId: 'booking-1',
    userId: 'user-1',
    amount: 500000,
    status: PaymentStatus.SUCCESS,
    providerReference: 'ref-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usersRepository.findOne.mockResolvedValue(null);
    provider = new RefundPaymentProvider(
      paymentsRepository as any,
      usersRepository as any,
      paystackProvider as any,
      bookingsService as any,
      emailService as any,
      notificationsService as any,
    );
  });

  describe('refund (admin-facing)', () => {
    it('rejects non-admin callers with 403 before touching the payment', async () => {
      await expect(
        provider.refund('pay-1', 'user-1', UserRole.USER),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(paymentsRepository.findOne).not.toHaveBeenCalled();
    });

    it('rejects STAFF callers too — only ADMIN/SUPER_ADMIN may refund', async () => {
      await expect(
        provider.refund('pay-1', 'user-1', UserRole.STAFF),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFoundException when the payment does not exist', async () => {
      paymentsRepository.findOne.mockResolvedValue(null);
      await expect(
        provider.refund('missing', 'admin-1', UserRole.ADMIN),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refunds the payment then cancels the linked booking', async () => {
      paymentsRepository.findOne.mockResolvedValue({ ...successPayment });
      paymentsRepository.save.mockImplementation((p) => Promise.resolve(p));
      bookingsService.findById.mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.CONFIRMED,
      });

      const result = await provider.refund('pay-1', 'admin-1', UserRole.ADMIN);

      expect(paystackProvider.initiateRefund).toHaveBeenCalledWith('ref-1');
      expect(result.status).toEqual(PaymentStatus.REFUNDED);
      expect(bookingsService.cancel).toHaveBeenCalledWith(
        'booking-1',
        'admin-1',
        UserRole.ADMIN,
      );
    });

    it('does not try to cancel a booking that is already cancelled', async () => {
      paymentsRepository.findOne.mockResolvedValue({ ...successPayment });
      paymentsRepository.save.mockImplementation((p) => Promise.resolve(p));
      bookingsService.findById.mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.CANCELLED,
      });

      await provider.refund('pay-1', 'admin-1', UserRole.SUPER_ADMIN);

      expect(bookingsService.cancel).not.toHaveBeenCalled();
    });

    it('rejects refunding a payment that is not SUCCESS', async () => {
      paymentsRepository.findOne.mockResolvedValue({
        ...successPayment,
        status: PaymentStatus.PENDING,
      });

      await expect(
        provider.refund('pay-1', 'admin-1', UserRole.ADMIN),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(bookingsService.cancel).not.toHaveBeenCalled();
    });
  });

  describe('refundCore', () => {
    it('calls Paystack, marks the payment REFUNDED, notifies and emails the user', async () => {
      paymentsRepository.save.mockImplementation((p) => Promise.resolve(p));
      usersRepository.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'a@example.com',
        fullName: 'A User',
      });

      const result = await provider.refundCore({ ...successPayment } as any);

      expect(paystackProvider.initiateRefund).toHaveBeenCalledWith('ref-1');
      expect(result.status).toEqual(PaymentStatus.REFUNDED);
      // Notification/email are fire-and-forget; flush the microtask queue.
      await Promise.resolve();
      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: NotificationType.PAYMENT_REFUNDED,
        }),
      );
    });

    it('rejects refunding a non-SUCCESS payment', async () => {
      await expect(
        provider.refundCore({
          ...successPayment,
          status: PaymentStatus.FAILED,
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(paystackProvider.initiateRefund).not.toHaveBeenCalled();
    });
  });
});
