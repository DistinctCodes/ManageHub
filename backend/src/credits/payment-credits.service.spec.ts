import { UnprocessableEntityException } from '@nestjs/common';
import { PaymentStatus } from '../payments/enums/payment-status.enum';
import { CreditsService } from './credits.service';
import { LedgerService } from './ledger.service';
import { RevenueSplitService } from './revenue-split.service';
import {
  CREDIT_TOP_UP_PURPOSE,
  PaymentCreditsService,
} from './payment-credits.service';
import { LedgerAccountKind } from './enums/ledger-account-kind.enum';
import { LedgerTransactionKind } from './enums/ledger-transaction-kind.enum';
import { PaymentCreditApplicationKind } from './enums/payment-credit-application-kind.enum';
import {
  createLedgerHarness,
  fakeConfigService,
} from './testing/in-memory-ledger';

/**
 * Stands in for the payments table. `createQueryBuilder` replicates the
 * sweep's SQL predicate in JS — confirmed, not yet applied, and either
 * marked as a top-up or carrying a split config. (The SQL itself is
 * exercised against a real database, not here; what this proves is the
 * behaviour that hangs off the candidate set.)
 */
function fakePaymentRepository(payments: any[], applications: any[]) {
  const isApplied = (paymentId: string) =>
    Boolean(
      applications.find((application) => application.paymentId === paymentId)
        ?.appliedAt,
    );
  const hasApplication = (paymentId: string) =>
    applications.some((application) => application.paymentId === paymentId);

  return {
    findOne: async ({ where }: any) =>
      payments.find((payment) => payment.id === where.id) ?? null,
    createQueryBuilder: () => {
      const builder: any = {
        leftJoin: () => builder,
        where: () => builder,
        andWhere: () => builder,
        orderBy: () => builder,
        take: () => builder,
        getMany: async () =>
          payments.filter(
            (payment) =>
              payment.status === PaymentStatus.CONFIRMED &&
              !isApplied(payment.id) &&
              (payment.metadata?.purpose === CREDIT_TOP_UP_PURPOSE ||
                hasApplication(payment.id)),
          ),
      };
      return builder;
    },
  };
}

function build() {
  const harness = createLedgerHarness();
  const payments: any[] = [];
  const ledger = new LedgerService(
    harness.accounts as any,
    harness.transactions as any,
    harness.entries as any,
  );
  const credits = new CreditsService(
    ledger,
    fakeConfigService({ CREDITS_DEFAULT_CURRENCY: 'USD' }),
  );
  const splits = new RevenueSplitService(
    harness.splitConfigs as any,
    harness.splitRecipients as any,
    ledger,
  );
  const paymentCredits = new PaymentCreditsService(
    fakePaymentRepository(payments, harness.paymentApplications.rows) as any,
    harness.paymentApplications as any,
    credits,
    splits,
    fakeConfigService({ CREDITS_PAYMENT_SWEEP_MAX_BATCH: 100 }),
  );

  function addPayment(overrides: Record<string, unknown> = {}) {
    const payment = {
      id: `payment-${payments.length + 1}`,
      userId: 'user-1',
      amount: 10_000,
      currency: 'USD',
      status: PaymentStatus.CONFIRMED,
      metadata: null,
      updatedAt: new Date(),
      ...overrides,
    };
    payments.push(payment);
    return payment;
  }

  return {
    harness,
    ledger,
    credits,
    splits,
    paymentCredits,
    payments,
    addPayment,
  };
}

describe('PaymentCreditsService — top-ups', () => {
  it('credits the payer when the payment declares itself a top-up', async () => {
    const { paymentCredits, credits, addPayment } = build();
    const payment = addPayment({
      amount: 5000,
      metadata: { purpose: CREDIT_TOP_UP_PURPOSE },
    });

    const application = await paymentCredits.applyPayment(payment.id);

    expect(application.kind).toBe(PaymentCreditApplicationKind.TOP_UP);
    expect(application.appliedAt).toBeTruthy();
    expect((await credits.getBalance('user-1')).balance).toBe(5000);
  });

  it('credits the payer for an explicitly marked payment', async () => {
    const { paymentCredits, credits, addPayment } = build();
    const payment = addPayment({ amount: 2500 });

    await paymentCredits.markAsTopUp(payment.id);
    await paymentCredits.applyPayment(payment.id);

    expect((await credits.getBalance('user-1')).balance).toBe(2500);
  });

  it('applies a payment only once, however often it is asked', async () => {
    const { paymentCredits, credits, harness, addPayment } = build();
    const payment = addPayment({
      amount: 5000,
      metadata: { purpose: CREDIT_TOP_UP_PURPOSE },
    });

    await paymentCredits.applyPayment(payment.id);
    await paymentCredits.applyPayment(payment.id);
    await paymentCredits.applyPayment(payment.id);

    expect((await credits.getBalance('user-1')).balance).toBe(5000);
    expect(
      harness.transactions.rows.filter(
        (transaction) => transaction.kind === LedgerTransactionKind.TOP_UP,
      ),
    ).toHaveLength(1);
  });

  it('refuses a payment that is not CONFIRMED', async () => {
    const { paymentCredits, addPayment } = build();
    const payment = addPayment({
      status: PaymentStatus.AWAITING_CONFIRMATION,
      metadata: { purpose: CREDIT_TOP_UP_PURPOSE },
    });

    await expect(paymentCredits.applyPayment(payment.id)).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('refuses a payment with no declared credit effect', async () => {
    const { paymentCredits, addPayment } = build();
    const payment = addPayment();
    await expect(paymentCredits.applyPayment(payment.id)).rejects.toThrow(
      /no credit-ledger effect/,
    );
  });

  it('honours the payment’s own currency', async () => {
    const { paymentCredits, credits, addPayment } = build();
    const payment = addPayment({
      amount: 4000,
      currency: 'EUR',
      metadata: { purpose: CREDIT_TOP_UP_PURPOSE },
    });

    await paymentCredits.applyPayment(payment.id);

    expect((await credits.getBalance('user-1', 'EUR')).balance).toBe(4000);
    expect((await credits.getBalance('user-1', 'USD')).balance).toBe(0);
  });
});

describe('PaymentCreditsService — revenue splits on a payment', () => {
  async function withSplitConfig() {
    const context = build();
    const platform = await context.credits.getSystemAccount(
      LedgerAccountKind.PLATFORM_FEE,
    );
    const operator = await context.credits.getPayableAccount(
      LedgerAccountKind.HUB_OPERATOR,
      'hub-1',
      'USD',
      'GOPERATORADDRESS',
    );
    const config = await context.splits.createConfig({
      name: 'hub-split',
      recipients: [
        { label: 'platform fee', basisPoints: 1500, accountId: platform.id },
        { label: 'hub operator', basisPoints: 8500, accountId: operator.id },
      ],
    });
    return { ...context, platform, operator, config };
  }

  it('distributes the amount across the attached config once confirmed', async () => {
    const { paymentCredits, addPayment, config, harness, platform, operator } =
      await withSplitConfig();
    const payment = addPayment({ amount: 10_000 });

    await paymentCredits.attachSplitConfig(payment.id, config.id);
    const application = await paymentCredits.applyPayment(payment.id);

    expect(application.kind).toBe(PaymentCreditApplicationKind.REVENUE_SPLIT);
    expect(harness.balanceOf(platform.id)).toBe(1500);
    expect(harness.balanceOf(operator.id)).toBe(8500);
  });

  it('refuses to attach a config to an already-applied payment', async () => {
    const { paymentCredits, addPayment, config } = await withSplitConfig();
    const payment = addPayment({
      metadata: { purpose: CREDIT_TOP_UP_PURPOSE },
    });
    await paymentCredits.applyPayment(payment.id);

    await expect(
      paymentCredits.attachSplitConfig(payment.id, config.id),
    ).rejects.toThrow(/already been applied/);
  });

  it('refuses a config with external-address recipients', async () => {
    const { paymentCredits, addPayment, splits, platform } =
      await withSplitConfig();
    const external = await splits.createConfig({
      name: 'external-partner',
      recipients: [
        { label: 'platform fee', basisPoints: 5000, accountId: platform.id },
        {
          label: 'partner',
          basisPoints: 5000,
          externalAddress: 'GPARTNERADDRESS',
        },
      ],
    });
    const payment = addPayment();

    await expect(
      paymentCredits.attachSplitConfig(payment.id, external.id),
    ).rejects.toThrow(/payment split cannot post internally/);
  });

  it('records the failure on the application when applying throws', async () => {
    const { paymentCredits, addPayment, config, splits } =
      await withSplitConfig();
    const payment = addPayment();
    await paymentCredits.attachSplitConfig(payment.id, config.id);
    await splits.setActive(config.id, false);

    await expect(paymentCredits.applyPayment(payment.id)).rejects.toThrow(
      /inactive/,
    );
    const application = await paymentCredits.getApplication(payment.id);
    expect(application!.appliedAt).toBeFalsy();
    expect(application!.lastError).toMatch(/inactive/);
  });
});

describe('PaymentCreditsService — the sweep', () => {
  it('applies every candidate and leaves nothing for the next pass', async () => {
    const { paymentCredits, credits, addPayment } = build();
    addPayment({ amount: 1000, metadata: { purpose: CREDIT_TOP_UP_PURPOSE } });
    addPayment({ amount: 2000, metadata: { purpose: CREDIT_TOP_UP_PURPOSE } });
    addPayment({ amount: 4000, status: PaymentStatus.AWAITING_CONFIRMATION });
    addPayment({ amount: 8000 });

    const first = await paymentCredits.sweepConfirmedPayments();
    expect(first).toMatchObject({ candidates: 2, applied: 2, failed: 0 });
    expect((await credits.getBalance('user-1')).balance).toBe(3000);

    const second = await paymentCredits.sweepConfirmedPayments();
    expect(second.candidates).toBe(0);
    expect((await credits.getBalance('user-1')).balance).toBe(3000);
  });

  it('keeps going after one candidate fails, and reports it', async () => {
    const { paymentCredits, credits, splits, addPayment } = build();
    const broken = addPayment({ amount: 1000 });
    const config = await splits.createConfig({
      name: 'will-be-inactive',
      recipients: [
        {
          label: 'platform fee',
          basisPoints: 10000,
          accountId: (
            await credits.getSystemAccount(LedgerAccountKind.PLATFORM_FEE)
          ).id,
        },
      ],
    });
    await paymentCredits.attachSplitConfig(broken.id, config.id);
    await splits.setActive(config.id, false);
    addPayment({ amount: 2000, metadata: { purpose: CREDIT_TOP_UP_PURPOSE } });

    const summary = await paymentCredits.sweepConfirmedPayments();

    expect(summary).toMatchObject({ candidates: 2, applied: 1, failed: 1 });
    expect((await credits.getBalance('user-1')).balance).toBe(2000);
  });
});
