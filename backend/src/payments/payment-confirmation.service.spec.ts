import { PaymentConfirmationService } from './payment-confirmation.service';
import { Payment } from './entities/payment.entity';
import { PaymentRail } from './enums/payment-rail.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { ConfirmationSource } from './enums/confirmation-source.enum';

type MockEventRepository = {
  create: jest.Mock;
  save: jest.Mock;
};

function makePaymentRepository() {
  return {
    findOne: jest.fn(),
    save: jest.fn(async (entity: Payment) => entity),
  };
}

function makeEventRepository(): MockEventRepository {
  return {
    create: jest.fn((data) => ({ ...data })),
    save: jest.fn(async (entity) => entity),
  };
}

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'payment-1',
    bookingId: 'booking-1',
    userId: 'user-1',
    amount: 500_000,
    currency: 'USD',
    rail: PaymentRail.FIAT,
    provider: null,
    providerReference: 'sandbox_ref_1',
    status: PaymentStatus.AWAITING_CONFIRMATION,
    idempotencyKey: 'key-1',
    metadata: null,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Payment;
}

describe('PaymentConfirmationService', () => {
  let paymentRepository: ReturnType<typeof makePaymentRepository>;
  let eventRepository: MockEventRepository;
  let paymentsService: { transitionStatus: jest.Mock };
  let gateway: { emitPaymentUpdate: jest.Mock };
  let railAdapter: { verifyByReference: jest.Mock };
  let config: { get: jest.Mock };
  let service: PaymentConfirmationService;

  beforeEach(() => {
    paymentRepository = makePaymentRepository();
    eventRepository = makeEventRepository();
    paymentsService = {
      transitionStatus: jest.fn((payment: Payment, next: PaymentStatus) => {
        payment.status = next;
        return payment;
      }),
    };
    gateway = { emitPaymentUpdate: jest.fn() };
    railAdapter = { verifyByReference: jest.fn() };
    config = { get: jest.fn((_key: string, fallback?: unknown) => fallback) };

    service = new PaymentConfirmationService(
      paymentRepository as any,
      eventRepository as any,
      paymentsService as any,
      gateway as any,
      railAdapter as any,
      config as any,
    );
  });

  describe('apply', () => {
    it('logs an anomaly and returns null when no payment matches the reference', async () => {
      paymentRepository.findOne.mockResolvedValueOnce(null);

      const result = await service.apply(
        'unknown-ref',
        'confirmed',
        ConfirmationSource.WEBHOOK,
        'hash-1',
      );

      expect(result).toBeNull();
      expect(eventRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentId: null,
          providerReference: 'unknown-ref',
          applied: false,
          anomaly: 'payment_not_found',
        }),
      );
    });

    it('transitions AWAITING_CONFIRMATION -> CONFIRMED and emits a real-time update', async () => {
      const payment = makePayment();
      paymentRepository.findOne.mockResolvedValueOnce(payment);

      const result = await service.apply(
        payment.providerReference!,
        'confirmed',
        ConfirmationSource.WEBHOOK,
        'hash-1',
      );

      expect(result?.status).toBe(PaymentStatus.CONFIRMED);
      expect(paymentsService.transitionStatus).toHaveBeenCalledWith(
        payment,
        PaymentStatus.CONFIRMED,
      );
      expect(gateway.emitPaymentUpdate).toHaveBeenCalledWith(
        payment.id,
        PaymentStatus.CONFIRMED,
      );
      expect(eventRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentId: payment.id,
          previousStatus: PaymentStatus.AWAITING_CONFIRMATION,
          resultingStatus: PaymentStatus.CONFIRMED,
          applied: true,
          anomaly: null,
        }),
      );
    });

    it('transitions to FAILED on a failed outcome', async () => {
      const payment = makePayment();
      paymentRepository.findOne.mockResolvedValueOnce(payment);

      const result = await service.apply(
        payment.providerReference!,
        'failed',
        ConfirmationSource.WEBHOOK,
        'hash-1',
      );

      expect(result?.status).toBe(PaymentStatus.FAILED);
      expect(gateway.emitPaymentUpdate).toHaveBeenCalledWith(
        payment.id,
        PaymentStatus.FAILED,
      );
    });

    it('does not change status or emit for a pending outcome', async () => {
      const payment = makePayment();
      paymentRepository.findOne.mockResolvedValueOnce(payment);

      const result = await service.apply(
        payment.providerReference!,
        'pending',
        ConfirmationSource.WEBHOOK,
        'hash-1',
      );

      expect(result?.status).toBe(PaymentStatus.AWAITING_CONFIRMATION);
      expect(paymentsService.transitionStatus).not.toHaveBeenCalled();
      expect(gateway.emitPaymentUpdate).not.toHaveBeenCalled();
      expect(eventRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ applied: false, anomaly: null }),
      );
    });

    it('is a clean no-op when a duplicate delivery repeats the same outcome on an already-terminal payment', async () => {
      const payment = makePayment({ status: PaymentStatus.CONFIRMED });
      paymentRepository.findOne.mockResolvedValueOnce(payment);

      const result = await service.apply(
        payment.providerReference!,
        'confirmed',
        ConfirmationSource.WEBHOOK,
        'hash-2',
      );

      expect(result?.status).toBe(PaymentStatus.CONFIRMED);
      expect(paymentsService.transitionStatus).not.toHaveBeenCalled();
      expect(paymentRepository.save).not.toHaveBeenCalled();
      expect(eventRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          applied: false,
          anomaly: null,
          previousStatus: PaymentStatus.CONFIRMED,
          resultingStatus: PaymentStatus.CONFIRMED,
        }),
      );
    });

    it('flags a conflicting event when a later delivery disagrees with the already-terminal status, without overwriting it', async () => {
      const payment = makePayment({ status: PaymentStatus.CONFIRMED });
      paymentRepository.findOne.mockResolvedValueOnce(payment);

      const result = await service.apply(
        payment.providerReference!,
        'failed',
        ConfirmationSource.WEBHOOK,
        'hash-3',
      );

      // Terminal state is never overwritten by a later, conflicting event.
      expect(result?.status).toBe(PaymentStatus.CONFIRMED);
      expect(paymentsService.transitionStatus).not.toHaveBeenCalled();
      expect(eventRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          applied: false,
          anomaly: 'conflicting_event',
        }),
      );
    });
  });

  describe('logRejectedWebhook', () => {
    it('logs a rejected webhook with no payment link', async () => {
      await service.logRejectedWebhook('hash-4', 'invalid_signature');

      expect(eventRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentId: null,
          providerReference: null,
          source: ConfirmationSource.WEBHOOK,
          rawPayloadHash: 'hash-4',
          applied: false,
          anomaly: 'invalid_signature',
        }),
      );
    });
  });

  describe('verifyOnReturn', () => {
    it('returns verified:true immediately for an already-terminal payment without calling the rail adapter', async () => {
      const payment = makePayment({ status: PaymentStatus.CONFIRMED });

      const result = await service.verifyOnReturn(payment);

      expect(result).toEqual({ payment, verified: true });
      expect(railAdapter.verifyByReference).not.toHaveBeenCalled();
    });

    it('returns verified:false when the payment has no providerReference', async () => {
      const payment = makePayment({ providerReference: null });

      const result = await service.verifyOnReturn(payment);

      expect(result).toEqual({ payment, verified: false });
      expect(railAdapter.verifyByReference).not.toHaveBeenCalled();
    });

    it('never marks the payment CONFIRMED when the provider call times out', async () => {
      const payment = makePayment();
      config.get.mockImplementation((key: string, fallback?: unknown) =>
        key === 'PAYMENT_VERIFY_TIMEOUT_MS' ? 20 : fallback,
      );
      // Never resolves — simulates an unresponsive provider.
      railAdapter.verifyByReference.mockReturnValueOnce(new Promise(() => {}));

      const result = await service.verifyOnReturn(payment);

      expect(result.verified).toBe(false);
      expect(result.payment.status).toBe(PaymentStatus.AWAITING_CONFIRMATION);
      expect(paymentsService.transitionStatus).not.toHaveBeenCalled();
    });

    it('never marks the payment CONFIRMED on a pending provider response', async () => {
      const payment = makePayment();
      railAdapter.verifyByReference.mockResolvedValueOnce({
        outcome: 'pending',
      });

      const result = await service.verifyOnReturn(payment);

      expect(result).toEqual({ payment, verified: false });
      expect(paymentsService.transitionStatus).not.toHaveBeenCalled();
    });

    it('applies a confirmed outcome from an authoritative provider response', async () => {
      const payment = makePayment();
      paymentRepository.findOne.mockResolvedValueOnce(payment);
      railAdapter.verifyByReference.mockResolvedValueOnce({
        outcome: 'confirmed',
      });

      const result = await service.verifyOnReturn(payment);

      expect(result.verified).toBe(true);
      expect(result.payment.status).toBe(PaymentStatus.CONFIRMED);
      expect(gateway.emitPaymentUpdate).toHaveBeenCalledWith(
        payment.id,
        PaymentStatus.CONFIRMED,
      );
    });

    it('never marks the payment CONFIRMED when the provider call rejects', async () => {
      const payment = makePayment();
      railAdapter.verifyByReference.mockRejectedValueOnce(
        new Error('provider unreachable'),
      );

      const result = await service.verifyOnReturn(payment);

      expect(result).toEqual({ payment, verified: false });
      expect(paymentsService.transitionStatus).not.toHaveBeenCalled();
    });
  });
});
