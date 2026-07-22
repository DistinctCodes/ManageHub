import { NotificationType } from '../../notifications/enums/notification-type.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentOutcomeProvider } from './payment-outcome.provider';

describe('PaymentOutcomeProvider', () => {
  const paymentsRepository = { findOne: jest.fn(), save: jest.fn() };
  const bookingsRepository = { findOne: jest.fn(), update: jest.fn() };
  const usersRepository = { findOne: jest.fn() };
  const sorobanEscrowProvider = { isEnabled: false, createEscrow: jest.fn() };
  const bookingsService = { confirm: jest.fn() };
  const invoicesService = {
    generateForPayment: jest.fn().mockResolvedValue(undefined),
  };
  const notificationsService = {
    create: jest.fn().mockResolvedValue(undefined),
  };
  const emailService = {
    sendPaymentSuccessEmail: jest.fn().mockResolvedValue(true),
    sendPaymentFailedEmail: jest.fn().mockResolvedValue(true),
  };

  let provider: PaymentOutcomeProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    paymentsRepository.save.mockImplementation((payment) =>
      Promise.resolve(payment),
    );
    usersRepository.findOne.mockResolvedValue(null);
    bookingsRepository.findOne.mockResolvedValue(null);
    provider = new PaymentOutcomeProvider(
      paymentsRepository as any,
      bookingsRepository as any,
      usersRepository as any,
      sorobanEscrowProvider as any,
      bookingsService as any,
      invoicesService as any,
      notificationsService as any,
      emailService as any,
    );
  });

  it('confirms the booking for a fresh PENDING payment', async () => {
    paymentsRepository.findOne.mockResolvedValue({
      id: 'pay-1',
      bookingId: 'booking-1',
      userId: 'user-1',
      status: PaymentStatus.PENDING,
      amount: 100000,
    });
    bookingsService.confirm.mockResolvedValue({
      id: 'booking-1',
      planType: 'daily',
    });

    await provider.handleChargeSuccess('ref-1', { reference: 'ref-1' });

    expect(bookingsService.confirm).toHaveBeenCalledWith('booking-1');
    expect(paymentsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: PaymentStatus.SUCCESS }),
    );
    expect(invoicesService.generateForPayment).toHaveBeenCalledWith('pay-1');
    expect(notificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: NotificationType.PAYMENT_SUCCESS,
      }),
    );
  });

  it('does not re-confirm a payment that is already SUCCESS', async () => {
    paymentsRepository.findOne.mockResolvedValue({
      id: 'pay-1',
      bookingId: 'booking-1',
      status: PaymentStatus.SUCCESS,
    });

    await provider.handleChargeSuccess('ref-1', { reference: 'ref-1' });

    expect(bookingsService.confirm).not.toHaveBeenCalled();
    expect(paymentsRepository.save).not.toHaveBeenCalled();
  });

  it('does not resurrect a booking whose payment was already REFUNDED', async () => {
    paymentsRepository.findOne.mockResolvedValue({
      id: 'pay-1',
      bookingId: 'booking-1',
      status: PaymentStatus.REFUNDED,
    });

    await provider.handleChargeSuccess('ref-1', { reference: 'ref-1' });

    expect(bookingsService.confirm).not.toHaveBeenCalled();
    expect(paymentsRepository.save).not.toHaveBeenCalled();
  });

  it('marks pending failed charges as FAILED and notifies the user', async () => {
    paymentsRepository.findOne.mockResolvedValue({
      id: 'pay-1',
      bookingId: 'booking-1',
      userId: 'user-1',
      providerReference: 'ref-1',
      status: PaymentStatus.PENDING,
      amount: 100000,
    });

    await provider.handleChargeFailed('ref-1');

    expect(paymentsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: PaymentStatus.FAILED }),
    );
    expect(notificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: NotificationType.PAYMENT_FAILED,
      }),
    );
  });
});
