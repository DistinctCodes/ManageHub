import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PaymentsAdminController } from './payments-admin.controller';
import { ReconciliationService } from './reconciliation.service';
import { ListManualReviewQueryDto } from './dto/list-manual-review-query.dto';
import { Payment } from './entities/payment.entity';
import { PaymentRail } from './enums/payment-rail.enum';
import { PaymentStatus } from './enums/payment-status.enum';

function makeManualReviewPayment(index: number): Payment {
  const base = new Date('2025-01-01T00:00:00.000Z').getTime();
  return {
    id: `p${String(index).padStart(3, '0')}`,
    bookingId: `booking-${index}`,
    userId: 'user-1',
    amount: 1_000,
    currency: 'USD',
    rail: PaymentRail.FIAT,
    provider: null,
    providerReference: `ref-${index}`,
    status: PaymentStatus.MANUAL_REVIEW,
    idempotencyKey: `key-${index}`,
    metadata: null,
    expiresAt: null,
    failureReason: null,
    reconciliationAttempts: 1,
    providerErrorStreak: 0,
    lastReconciledAt: null,
    manualReviewReason: `reason-${index}`,
    createdAt: new Date(base + index * 1_000),
    updatedAt: new Date(base + index * 1_000),
  } as Payment;
}

/** Minimal Repository<Payment> fake supporting the paginated findAndCount query. */
function makePaymentRepository(seed: Payment[]) {
  return {
    findAndCount: jest.fn(
      async (options: {
        where: { status: PaymentStatus };
        order?: { updatedAt?: 'ASC' | 'DESC'; id?: 'ASC' | 'DESC' };
        take?: number;
        skip?: number;
      }) => {
        const filtered = seed.filter(
          (payment) => payment.status === options.where.status,
        );
        filtered.sort((left, right) => {
          const byUpdatedAt =
            left.updatedAt.getTime() - right.updatedAt.getTime();
          return byUpdatedAt !== 0
            ? byUpdatedAt
            : left.id.localeCompare(right.id);
        });
        const total = filtered.length;
        const skip = options.skip ?? 0;
        const take = options.take ?? filtered.length;
        return [
          filtered.slice(skip, skip + take).map((payment) => ({ ...payment })),
          total,
        ];
      },
    ),
    count: jest.fn(async () => seed.length),
    findOne: jest.fn(),
  };
}

describe('PaymentsAdminController — manual-review pagination (issue #1944)', () => {
  let controller: PaymentsAdminController;
  let reconciliationService: ReconciliationService;
  let refundsService: { requestRefund: jest.Mock };
  let audit: { record: jest.Mock };

  function build(seed: Payment[]) {
    const paymentRepository = makePaymentRepository(seed);
    reconciliationService = new ReconciliationService(
      paymentRepository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { get: (_key: string, fallback?: unknown) => fallback } as any,
      {
        setReconciliationMismatchCount: jest.fn(),
        recordReconciliationMismatches: jest.fn(),
        recordRejectedPaymentTransition: jest.fn(),
      } as any,
    );
    refundsService = { requestRefund: jest.fn() };
    audit = { record: jest.fn() };
    controller = new PaymentsAdminController(
      reconciliationService,
      refundsService as any,
      audit as any,
    );
    return controller;
  }

  const seedReview = (count: number): Payment[] =>
    Array.from({ length: count }, (_, i) => makeManualReviewPayment(i));

  const query = (limit: number, offset: number): ListManualReviewQueryDto =>
    plainToInstance(ListManualReviewQueryDto, { limit, offset });

  it('returns the first page with the full total', async () => {
    build(seedReview(60));

    const page = await controller.listManualReview(query(25, 0));

    expect(page.total).toBe(60);
    expect(page.items).toHaveLength(25);
    expect(page.items[0].id).toBe('p000');
    expect(page.items[24].id).toBe('p024');
  });

  it('returns a short last page', async () => {
    build(seedReview(60));

    const page = await controller.listManualReview(query(25, 50));

    expect(page.total).toBe(60);
    expect(page.items).toHaveLength(10);
    expect(page.items[0].id).toBe('p050');
  });

  it('returns an empty page for an out-of-range offset', async () => {
    build(seedReview(60));

    const page = await controller.listManualReview(query(25, 500));

    expect(page.total).toBe(60);
    expect(page.items).toEqual([]);
  });

  it('applies the default page size and rejects an over-maximum limit', async () => {
    const defaults = plainToInstance(ListManualReviewQueryDto, {});
    expect(defaults.limit).toBe(25);
    expect(defaults.offset).toBe(0);

    const tooLarge = plainToInstance(ListManualReviewQueryDto, { limit: 101 });
    const errors = await validate(tooLarge);
    expect(errors.some((error) => error.property === 'limit')).toBe(true);

    const negativeOffset = plainToInstance(ListManualReviewQueryDto, {
      offset: -1,
    });
    const offsetErrors = await validate(negativeOffset);
    expect(offsetErrors.some((error) => error.property === 'offset')).toBe(
      true,
    );
  });

  it('delegates the remaining admin actions through the reconciliation service', async () => {
    build(seedReview(1));
    const payment = makeManualReviewPayment(0);
    jest
      .spyOn(reconciliationService, 'forceReconcileNow')
      .mockResolvedValue(payment);
    jest
      .spyOn(reconciliationService, 'resolveManually')
      .mockResolvedValue(payment);
    jest.spyOn(reconciliationService, 'void').mockResolvedValue(payment);
    refundsService.requestRefund.mockResolvedValue({
      payment,
      refund: { id: 'refund-1' },
    });

    const reconciled = await controller.forceReconcile(payment.id);
    expect(reconciled.id).toBe(payment.id);

    await controller.resolveManually(
      payment.id,
      { resolution: PaymentStatus.CONFIRMED, reason: 'checked' } as any,
      { id: 'admin-1', role: 'ADMIN' } as any,
    );
    expect(audit.record).toHaveBeenCalledTimes(1);

    await controller.void(
      payment.id,
      { reason: 'cancelled' } as any,
      { id: 'admin-1', role: 'ADMIN' } as any,
    );
    expect(audit.record).toHaveBeenCalledTimes(2);

    const refund = await controller.requestRefund(
      payment.id,
      { amount: 500, reason: 'partial' } as any,
      { id: 'admin-1', role: 'ADMIN' } as any,
    );
    expect(refundsService.requestRefund).toHaveBeenCalledWith(
      payment.id,
      500,
      'partial',
      'admin-1',
    );
    expect(refund.refund.id).toBe('refund-1');
  });
});
