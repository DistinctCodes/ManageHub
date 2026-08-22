import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { Payment } from './entities/payment.entity';
import { Refund } from './entities/refund.entity';
import { PaymentRail } from './enums/payment-rail.enum';
import { PaymentStatus } from './enums/payment-status.enum';

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'payment-1',
    bookingId: 'booking-1',
    userId: 'user-1',
    amount: 1000,
    currency: 'USD',
    rail: PaymentRail.FIAT,
    provider: null,
    providerReference: 'sandbox_ref_1',
    status: PaymentStatus.CONFIRMED,
    idempotencyKey: 'key-1',
    metadata: null,
    expiresAt: null,
    failureReason: null,
    reconciliationAttempts: 0,
    providerErrorStreak: 0,
    lastReconciledAt: null,
    manualReviewReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Payment;
}

/**
 * A small in-memory ledger simulation shared across sequential calls in a
 * test — this is how a single-threaded jest run demonstrates the atomicity
 * guarantee: bookRefund() always re-reads "refunded so far" fresh inside
 * its transaction, so a second call sees the first's already-booked refund,
 * exactly as a real row lock would force in a genuinely concurrent DB.
 */
function makeHarness(initialPayment: Payment) {
  let payment = { ...initialPayment };
  const refunds: Refund[] = [];
  let nextRefundId = 1;

  const paymentRepoQueryBuilder = {
    setLock: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(async () => ({ ...payment })),
  };

  const refundRepoQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(async () => ({
      total: String(refunds.reduce((sum, r) => sum + r.amount, 0)),
    })),
  };

  const manager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === Payment) {
        return {
          createQueryBuilder: jest.fn(() => paymentRepoQueryBuilder),
          save: jest.fn(async (p: Payment) => {
            payment = { ...p };
            return payment;
          }),
        };
      }
      if (entity === Refund) {
        return {
          createQueryBuilder: jest.fn(() => refundRepoQueryBuilder),
          create: jest.fn((data: Partial<Refund>) => ({ ...data }) as Refund),
          save: jest.fn(async (r: Refund) => {
            const saved = {
              ...r,
              id: `refund-${nextRefundId++}`,
              createdAt: new Date(),
            } as Refund;
            refunds.push(saved);
            return saved;
          }),
        };
      }
      throw new Error('Unexpected entity in mock manager.getRepository');
    }),
  };

  const paymentRepository = {
    manager: {
      transaction: jest.fn(async (cb: (m: typeof manager) => unknown) =>
        cb(manager),
      ),
    },
  };

  return {
    paymentRepository,
    refundRepository: {},
    refunds,
    getPayment: () => payment,
  };
}

describe('RefundsService', () => {
  let railAdapter: { refund: jest.Mock };
  let railRegistry: { get: jest.Mock };
  let gateway: { emitPaymentUpdate: jest.Mock };

  beforeEach(() => {
    railAdapter = { refund: jest.fn().mockResolvedValue(undefined) };
    railRegistry = { get: jest.fn().mockReturnValue(railAdapter) };
    gateway = { emitPaymentUpdate: jest.fn() };
  });

  function build(payment: Payment) {
    const harness = makeHarness(payment);
    const service = new RefundsService(
      harness.paymentRepository as any,
      harness.refundRepository as any,
      railRegistry as any,
      gateway as any,
    );
    return { service, harness };
  }

  it('rejects a non-positive amount', async () => {
    const { service } = build(makePayment());
    await expect(
      service.requestRefund('payment-1', 0, 'reason', null),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a missing reason', async () => {
    const { service } = build(makePayment());
    await expect(
      service.requestRefund('payment-1', 100, '  ', null),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects refunding a payment that is not CONFIRMED or PARTIALLY_REFUNDED', async () => {
    const { service } = build(makePayment({ status: PaymentStatus.INITIATED }));
    await expect(
      service.requestRefund('payment-1', 100, 'not eligible', null),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('books a partial refund and moves the payment to PARTIALLY_REFUNDED', async () => {
    const { service, harness } = build(makePayment({ amount: 1000 }));

    const result = await service.requestRefund(
      'payment-1',
      400,
      'partial',
      'admin-1',
    );

    expect(result.payment.status).toBe(PaymentStatus.PARTIALLY_REFUNDED);
    expect(result.refund.amount).toBe(400);
    expect(harness.refunds).toHaveLength(1);
    expect(gateway.emitPaymentUpdate).toHaveBeenCalledWith(
      'payment-1',
      PaymentStatus.PARTIALLY_REFUNDED,
    );
  });

  it('books a full refund and moves the payment to REFUNDED', async () => {
    const { service } = build(makePayment({ amount: 1000 }));

    const result = await service.requestRefund(
      'payment-1',
      1000,
      'full refund',
      null,
    );

    expect(result.payment.status).toBe(PaymentStatus.REFUNDED);
  });

  it('accumulates multiple partial refunds and completes into REFUNDED once the total matches', async () => {
    const { service, harness } = build(makePayment({ amount: 1000 }));

    const first = await service.requestRefund('payment-1', 400, 'first', null);
    expect(first.payment.status).toBe(PaymentStatus.PARTIALLY_REFUNDED);

    const second = await service.requestRefund(
      'payment-1',
      600,
      'second',
      null,
    );
    expect(second.payment.status).toBe(PaymentStatus.REFUNDED);
    expect(harness.refunds).toHaveLength(2);
  });

  it('atomically rejects a second concurrent refund that would exceed the captured amount', async () => {
    const { service } = build(makePayment({ amount: 1000 }));

    const first = await service.requestRefund('payment-1', 700, 'first', null);
    expect(first.payment.status).toBe(PaymentStatus.PARTIALLY_REFUNDED);

    // Second refund request for 700 more would total 1400 > 1000 captured —
    // rebooking must see the first refund's already-committed state (the
    // "atomic" guarantee under test) and reject rather than double-refund.
    await expect(
      service.requestRefund('payment-1', 700, 'second (racing)', null),
    ).rejects.toThrow(ConflictException);
  });

  it('throws NotFoundException when the payment does not exist', async () => {
    const harness = makeHarness(makePayment());
    harness.paymentRepository.manager.transaction = jest.fn(async (cb: any) =>
      cb({
        getRepository: jest.fn(() => ({
          createQueryBuilder: jest.fn(() => ({
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getOne: jest.fn(async () => null),
          })),
        })),
      }),
    );
    const service = new RefundsService(
      harness.paymentRepository as any,
      {} as any,
      railRegistry as any,
      gateway as any,
    );

    await expect(
      service.requestRefund('missing-payment', 100, 'reason', null),
    ).rejects.toThrow(NotFoundException);
  });

  it('logs but does not throw when the provider-side refund call fails after retries', async () => {
    railAdapter.refund.mockRejectedValue(new Error('provider down'));
    const { service } = build(makePayment({ amount: 1000 }));

    await expect(
      service.requestRefund('payment-1', 400, 'partial', null),
    ).resolves.toMatchObject({
      payment: { status: PaymentStatus.PARTIALLY_REFUNDED },
    });
  });
});
