import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { FindOperator } from 'typeorm';
import { ReconciliationService } from './reconciliation.service';
import { Payment } from './entities/payment.entity';
import { PaymentRail } from './enums/payment-rail.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { PaymentFailureReason } from './enums/payment-failure-reason.enum';
import { ConfirmationSource } from './enums/confirmation-source.enum';

function makePayment(overrides: Partial<Payment> = {}): Payment {
  const now = new Date();
  return {
    id: 'payment-1',
    bookingId: 'booking-1',
    userId: 'user-1',
    amount: 1000,
    currency: 'USD',
    rail: PaymentRail.FIAT,
    provider: null,
    providerReference: 'sandbox_ref_1',
    status: PaymentStatus.AWAITING_CONFIRMATION,
    idempotencyKey: 'key-1',
    metadata: null,
    expiresAt: null,
    failureReason: null,
    reconciliationAttempts: 0,
    providerErrorStreak: 0,
    lastReconciledAt: null,
    manualReviewReason: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as Payment;
}

function matchesCondition(
  payment: Payment,
  key: string,
  condition: unknown,
): boolean {
  const value = (payment as unknown as Record<string, unknown>)[key];
  if (condition instanceof FindOperator) {
    if (condition.type === 'lessThan') {
      const target = condition.value as Date;
      return value instanceof Date && value.getTime() < target.getTime();
    }
    throw new Error(`Unsupported FindOperator in test fake: ${condition.type}`);
  }
  return value === condition;
}

function matchesWhere(
  payment: Payment,
  where: Record<string, unknown>,
): boolean {
  return Object.entries(where).every(([key, condition]) =>
    matchesCondition(payment, key, condition),
  );
}

/** Minimal in-memory Repository<Payment> fake — enough to exercise real TypeORM `where` semantics. */
function makePaymentRepository(seed: Payment[]) {
  const rows = [...seed];

  return {
    find: jest.fn(
      async (options?: {
        where?: Record<string, unknown> | Record<string, unknown>[];
        take?: number;
      }) => {
        let result = rows;
        if (options?.where) {
          const clauses = Array.isArray(options.where)
            ? options.where
            : [options.where];
          result = rows.filter((p) =>
            clauses.some((clause) => matchesWhere(p, clause)),
          );
        }
        if (options?.take) {
          result = result.slice(0, options.take);
        }
        return result.map((p) => ({ ...p }));
      },
    ),
    findOne: jest.fn(async (options: { where: Record<string, unknown> }) => {
      const found = rows.find((p) => matchesWhere(p, options.where));
      return found ? { ...found } : null;
    }),
    save: jest.fn(async (entity: Payment) => {
      const index = rows.findIndex((p) => p.id === entity.id);
      if (index >= 0) {
        rows[index] = { ...entity };
      }
      return { ...entity };
    }),
    update: jest.fn(async (id: string, partial: Partial<Payment>) => {
      const index = rows.findIndex((p) => p.id === id);
      if (index >= 0) {
        rows[index] = { ...rows[index], ...partial };
      }
      return { affected: index >= 0 ? 1 : 0 };
    }),
    count: jest.fn(async (options?: { where?: Record<string, unknown> }) => {
      if (!options?.where) return rows.length;
      return rows.filter((p) => matchesWhere(p, options.where!)).length;
    }),
    _rows: rows,
  };
}

function makeConfigService(overrides: Record<string, number> = {}) {
  const values: Record<string, number> = {
    PAYMENT_RECONCILE_DUE_AFTER_MINUTES: 5,
    PAYMENT_RECONCILE_BACKOFF_BASE_MINUTES: 5,
    PAYMENT_RECONCILE_BACKOFF_MAX_MINUTES: 60,
    PAYMENT_MANUAL_REVIEW_AFTER_HOURS: 24,
    PAYMENT_VERIFY_TIMEOUT_MS: 3000,
    PAYMENT_RECONCILE_MAX_BATCH: 500,
    PAYMENT_MANUAL_REVIEW_ALERT_THRESHOLD: 20,
    ...overrides,
  };
  return {
    get: jest.fn((key: string, fallback?: number) => values[key] ?? fallback),
  };
}

describe('ReconciliationService', () => {
  let railAdapter: { verifyByReference: jest.Mock };
  let railRegistry: { get: jest.Mock };
  let confirmationService: { apply: jest.Mock };
  let gateway: { emitPaymentUpdate: jest.Mock };

  beforeEach(() => {
    railAdapter = { verifyByReference: jest.fn() };
    railRegistry = { get: jest.fn().mockReturnValue(railAdapter) };
    confirmationService = { apply: jest.fn() };
    gateway = { emitPaymentUpdate: jest.fn() };
  });

  function build(
    seed: Payment[],
    configOverrides: Record<string, number> = {},
  ) {
    const paymentRepository = makePaymentRepository(seed);
    const config = makeConfigService(configOverrides);
    const service = new ReconciliationService(
      paymentRepository as any,
      confirmationService as any,
      railRegistry as any,
      gateway as any,
      config as any,
    );
    return { service, paymentRepository };
  }

  const minutesAgo = (n: number, from: Date = new Date()) =>
    new Date(from.getTime() - n * 60_000);
  const hoursAgo = (n: number, from: Date = new Date()) =>
    new Date(from.getTime() - n * 3_600_000);

  describe('reconcileDueBatch — resolves a webhook-never-arrives scenario', () => {
    it('resolves a due, old-enough payment via the provider verify call', async () => {
      const now = new Date();
      const payment = makePayment({ createdAt: minutesAgo(10, now) });
      confirmationService.apply.mockResolvedValue({
        ...payment,
        status: PaymentStatus.CONFIRMED,
      });
      railAdapter.verifyByReference.mockResolvedValue({ outcome: 'confirmed' });

      const { service } = build([payment]);
      const summary = await service.reconcileDueBatch(now);

      expect(summary.candidates).toBe(1);
      expect(summary.resolved).toBe(1);
      expect(confirmationService.apply).toHaveBeenCalledWith(
        payment.providerReference,
        'confirmed',
        ConfirmationSource.RECONCILIATION,
        expect.any(String),
      );
    });

    it('excludes payments still within the initial grace window', async () => {
      const now = new Date();
      const payment = makePayment({ createdAt: minutesAgo(1, now) });

      const { service } = build([payment]);
      const summary = await service.reconcileDueBatch(now);

      expect(summary.candidates).toBe(0);
      expect(railAdapter.verifyByReference).not.toHaveBeenCalled();
    });

    it('excludes a payment still within its backoff window from a prior attempt', async () => {
      const now = new Date();
      const payment = makePayment({
        createdAt: minutesAgo(30, now),
        reconciliationAttempts: 1,
        // backoff for 1 prior attempt = 5 * 2^1 = 10 minutes
        lastReconciledAt: minutesAgo(3, now),
      });

      const { service } = build([payment]);
      const summary = await service.reconcileDueBatch(now);

      expect(summary.candidates).toBe(0);
      expect(railAdapter.verifyByReference).not.toHaveBeenCalled();
    });

    it('includes a payment once its backoff window has elapsed', async () => {
      const now = new Date();
      const payment = makePayment({
        createdAt: minutesAgo(30, now),
        reconciliationAttempts: 1,
        lastReconciledAt: minutesAgo(11, now), // backoff was 10 minutes
      });
      railAdapter.verifyByReference.mockResolvedValue({ outcome: 'pending' });

      const { service } = build([payment]);
      const summary = await service.reconcileDueBatch(now);

      expect(summary.candidates).toBe(1);
      expect(summary.pending).toBe(1);
    });
  });

  describe('reconcileDueBatch — provider outage does not cause false-positive escalation', () => {
    it('does not escalate an old payment to MANUAL_REVIEW when this attempt is itself a provider outage', async () => {
      const now = new Date();
      const payment = makePayment({ createdAt: hoursAgo(48, now) }); // well past the 24h threshold
      railAdapter.verifyByReference.mockRejectedValue(
        new Error('provider unreachable'),
      );

      const { service, paymentRepository } = build([payment]);
      const summary = await service.reconcileDueBatch(now);

      expect(summary.providerErrors).toBe(1);
      expect(summary.escalatedToManualReview).toBe(0);
      const updated = await paymentRepository.findOne({
        where: { id: payment.id },
      });
      expect(updated!.status).toBe(PaymentStatus.AWAITING_CONFIRMATION);
      expect(updated!.providerErrorStreak).toBe(1);
    });

    it('escalates an old payment to MANUAL_REVIEW once the provider is reachable but still pending', async () => {
      const now = new Date();
      const payment = makePayment({ createdAt: hoursAgo(48, now) });
      railAdapter.verifyByReference.mockResolvedValue({ outcome: 'pending' });

      const { service, paymentRepository } = build([payment]);
      const summary = await service.reconcileDueBatch(now);

      expect(summary.escalatedToManualReview).toBe(1);
      const updated = await paymentRepository.findOne({
        where: { id: payment.id },
      });
      expect(updated!.status).toBe(PaymentStatus.MANUAL_REVIEW);
      expect(updated!.manualReviewReason).toMatch(/Unresolved after/);
      expect(gateway.emitPaymentUpdate).toHaveBeenCalledWith(
        payment.id,
        PaymentStatus.MANUAL_REVIEW,
      );
    });

    it('resets the provider error streak after a successful contact', async () => {
      const now = new Date();
      const payment = makePayment({
        createdAt: minutesAgo(30, now),
        providerErrorStreak: 4,
      });
      railAdapter.verifyByReference.mockResolvedValue({ outcome: 'pending' });

      const { service, paymentRepository } = build([payment]);
      await service.reconcileDueBatch(now);

      const updated = await paymentRepository.findOne({
        where: { id: payment.id },
      });
      expect(updated!.providerErrorStreak).toBe(0);
    });
  });

  describe('reconcileDueBatch — idempotency', () => {
    it('is safe to run twice: a resolved payment is not reprocessed on the second pass', async () => {
      const now = new Date();
      const payment = makePayment({ createdAt: minutesAgo(10, now) });
      confirmationService.apply.mockResolvedValue({
        ...payment,
        status: PaymentStatus.CONFIRMED,
      });
      railAdapter.verifyByReference.mockResolvedValue({ outcome: 'confirmed' });

      const { service, paymentRepository } = build([payment]);
      await service.reconcileDueBatch(now);
      // The confirmationService.apply mock doesn't actually flip the fake
      // repository's row to CONFIRMED (it's mocked, not the real
      // idempotent implementation) — simulate what apply() would really do
      // so the second pass's status=AWAITING_CONFIRMATION query excludes it.
      await paymentRepository.update(payment.id, {
        status: PaymentStatus.CONFIRMED,
      });

      await service.reconcileDueBatch(new Date(now.getTime() + 60_000));

      expect(confirmationService.apply).toHaveBeenCalledTimes(1);
    });
  });

  describe('sweepExpired (via reconcileDueBatch)', () => {
    it('expires an INITIATED payment past its TTL with reason ABANDONED', async () => {
      const now = new Date();
      const payment = makePayment({
        status: PaymentStatus.INITIATED,
        expiresAt: minutesAgo(1, now),
      });

      const { service, paymentRepository } = build([payment]);
      const summary = await service.reconcileDueBatch(now);

      expect(summary.expiredSwept).toBe(1);
      const updated = await paymentRepository.findOne({
        where: { id: payment.id },
      });
      expect(updated!.status).toBe(PaymentStatus.EXPIRED);
      expect(updated!.failureReason).toBe(PaymentFailureReason.ABANDONED);
    });

    it('expires an AWAITING_CONFIRMATION payment past its TTL with reason EXPIRED', async () => {
      const now = new Date();
      const payment = makePayment({
        status: PaymentStatus.AWAITING_CONFIRMATION,
        expiresAt: minutesAgo(1, now),
        createdAt: minutesAgo(30, now),
      });

      const { service, paymentRepository } = build([payment]);
      const summary = await service.reconcileDueBatch(now);

      expect(summary.expiredSwept).toBe(1);
      const updated = await paymentRepository.findOne({
        where: { id: payment.id },
      });
      expect(updated!.status).toBe(PaymentStatus.EXPIRED);
      expect(updated!.failureReason).toBe(PaymentFailureReason.EXPIRED);
      // Already swept to EXPIRED — must not also be treated as an
      // AWAITING_CONFIRMATION reconciliation candidate in the same pass.
      expect(railAdapter.verifyByReference).not.toHaveBeenCalled();
    });

    it('does not expire a payment with no expiresAt set', async () => {
      const now = new Date();
      const payment = makePayment({
        status: PaymentStatus.INITIATED,
        expiresAt: null,
      });

      const { service } = build([payment]);
      const summary = await service.reconcileDueBatch(now);

      expect(summary.expiredSwept).toBe(0);
    });
  });

  describe('admin recovery actions', () => {
    it('forceReconcileNow reconciles a payment immediately, bypassing the due schedule', async () => {
      const now = new Date();
      const payment = makePayment({ createdAt: minutesAgo(1, now) }); // would NOT be due yet
      confirmationService.apply.mockResolvedValue({
        ...payment,
        status: PaymentStatus.CONFIRMED,
      });
      railAdapter.verifyByReference.mockResolvedValue({ outcome: 'confirmed' });

      const { service } = build([payment]);
      await service.forceReconcileNow(payment.id);

      expect(railAdapter.verifyByReference).toHaveBeenCalledWith(
        payment.providerReference,
      );
    });

    it('forceReconcileNow rejects a payment that is not AWAITING_CONFIRMATION', async () => {
      const payment = makePayment({ status: PaymentStatus.CONFIRMED });
      const { service } = build([payment]);

      await expect(service.forceReconcileNow(payment.id)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('resolveManually requires a reason', async () => {
      const payment = makePayment({ status: PaymentStatus.MANUAL_REVIEW });
      const { service } = build([payment]);

      await expect(
        service.resolveManually(payment.id, PaymentStatus.CONFIRMED, ''),
      ).rejects.toThrow(/reason is required/);
    });

    it('resolveManually transitions MANUAL_REVIEW to CONFIRMED with the given reason', async () => {
      const payment = makePayment({ status: PaymentStatus.MANUAL_REVIEW });
      const { service } = build([payment]);

      const result = await service.resolveManually(
        payment.id,
        PaymentStatus.CONFIRMED,
        'Verified manually with the provider dashboard',
      );

      expect(result.status).toBe(PaymentStatus.CONFIRMED);
      expect(result.manualReviewReason).toBe(
        'Verified manually with the provider dashboard',
      );
    });

    it('resolveManually sets a DECLINED failureReason when resolving to FAILED', async () => {
      const payment = makePayment({ status: PaymentStatus.MANUAL_REVIEW });
      const { service } = build([payment]);

      const result = await service.resolveManually(
        payment.id,
        PaymentStatus.FAILED,
        'Confirmed declined',
      );

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.failureReason).toBe(PaymentFailureReason.DECLINED);
    });

    it('void requires a reason and transitions MANUAL_REVIEW to VOIDED', async () => {
      const payment = makePayment({ status: PaymentStatus.MANUAL_REVIEW });
      const { service } = build([payment]);

      await expect(service.void(payment.id, '')).rejects.toThrow(
        /reason is required/,
      );

      const result = await service.void(
        payment.id,
        'Booking cancelled by shipper',
      );
      expect(result.status).toBe(PaymentStatus.VOIDED);
    });

    it('throws NotFoundException for an unknown payment id', async () => {
      const { service } = build([]);
      await expect(service.forceReconcileNow('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('listManualReview returns only MANUAL_REVIEW payments', async () => {
      const inReview = makePayment({
        id: 'p1',
        status: PaymentStatus.MANUAL_REVIEW,
      });
      const confirmed = makePayment({
        id: 'p2',
        status: PaymentStatus.CONFIRMED,
      });
      const { service } = build([inReview, confirmed]);

      const result = await service.listManualReview();
      expect(result.map((p) => p.id)).toEqual(['p1']);
    });

    it('getMetrics reports the manual-review queue depth and alerting flag', async () => {
      const payments = Array.from({ length: 25 }, (_, i) =>
        makePayment({ id: `p${i}`, status: PaymentStatus.MANUAL_REVIEW }),
      );
      const { service } = build(payments);

      const metrics = await service.getMetrics();
      expect(metrics.manualReviewQueueDepth).toBe(25);
      expect(metrics.alertThreshold).toBe(20);
      expect(metrics.alerting).toBe(true);
    });
  });
});
