import { HandleWebhookProvider } from './handle-webhook.provider';
import { PaymentStatus } from '../enums/payment-status.enum';

describe('HandleWebhookProvider — charge.success idempotency', () => {
  let provider: HandleWebhookProvider;

  const paymentsRepository = { findOne: jest.fn(), save: jest.fn() };
  const bookingsRepository = { findOne: jest.fn(), update: jest.fn() };
  const usersRepository = { findOne: jest.fn() };
  const paystackProvider = {
    verifyWebhookSignature: jest.fn().mockReturnValue(true),
  };
  const sorobanEscrowProvider = { createEscrow: jest.fn() };
  const bookingsService = { confirm: jest.fn() };
  const invoicesService = {
    generateForPayment: jest.fn().mockResolvedValue(undefined),
  };
  const notificationsService = {
    create: jest.fn().mockResolvedValue(undefined),
  };
  const emailService = {
    sendPaymentSuccessEmail: jest.fn().mockResolvedValue(true),
  };

  const buildEvent = (reference: string) =>
    Buffer.from(
      JSON.stringify({ event: 'charge.success', data: { reference } }),
    );

  beforeEach(() => {
    jest.clearAllMocks();
    paymentsRepository.save.mockImplementation((p: unknown) =>
      Promise.resolve(p),
    );
    usersRepository.findOne.mockResolvedValue(null);
    bookingsRepository.findOne.mockResolvedValue(null);
    provider = new HandleWebhookProvider(
      paymentsRepository as any,
      bookingsRepository as any,
      usersRepository as any,
      paystackProvider as any,
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
      status: PaymentStatus.PENDING,
      amount: 100000,
    });
    bookingsService.confirm.mockResolvedValue({
      id: 'booking-1',
      planType: 'daily',
    });

    await provider.handle(buildEvent('ref-1'), 'sig');

    expect(bookingsService.confirm).toHaveBeenCalledWith('booking-1');
    expect(paymentsRepository.save).toHaveBeenCalled();
  });

  it('does not re-confirm a payment that is already SUCCESS', async () => {
    paymentsRepository.findOne.mockResolvedValue({
      id: 'pay-1',
      bookingId: 'booking-1',
      status: PaymentStatus.SUCCESS,
    });

    await provider.handle(buildEvent('ref-1'), 'sig');

    expect(bookingsService.confirm).not.toHaveBeenCalled();
    expect(paymentsRepository.save).not.toHaveBeenCalled();
  });

  it('does not resurrect a booking whose payment was already REFUNDED', async () => {
    paymentsRepository.findOne.mockResolvedValue({
      id: 'pay-1',
      bookingId: 'booking-1',
      status: PaymentStatus.REFUNDED,
    });

    await provider.handle(buildEvent('ref-1'), 'sig');

    expect(bookingsService.confirm).not.toHaveBeenCalled();
    expect(paymentsRepository.save).not.toHaveBeenCalled();
  });
});
