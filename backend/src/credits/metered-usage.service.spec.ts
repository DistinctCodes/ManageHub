import { BadRequestException } from '@nestjs/common';
import { CreditsService } from './credits.service';
import { InsufficientCreditException, LedgerService } from './ledger.service';
import { MeteredUsageService } from './metered-usage.service';
import { LedgerAccountKind } from './enums/ledger-account-kind.enum';
import { MeteredResource } from './enums/metered-resource.enum';
import { createTransport } from 'nodemailer';
import {
  createLedgerHarness,
  fakeConfigService,
} from './testing/in-memory-ledger';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

function build(configValues: Record<string, unknown> = {}) {
  const harness = createLedgerHarness();
  const config = fakeConfigService({
    CREDITS_DEFAULT_CURRENCY: 'USD',
    CREDITS_DEFAULT_OVERDRAFT_LIMIT: 0,
    ...configValues,
  });
  const ledger = new LedgerService(
    harness.accounts as any,
    harness.transactions as any,
    harness.entries as any,
  );
  const credits = new CreditsService(ledger, config);
  const metrics = { recordCreditUsageSpike: jest.fn() };
  const usage = new MeteredUsageService(
    harness.usageEvents as any,
    credits,
    config as any,
    metrics as any,
  );
  return { harness, ledger, credits, usage, config, metrics };
}

async function fund(credits: CreditsService, amount: number) {
  await credits.topUpFromPayment({
    paymentId: 'payment-1',
    userId: 'user-1',
    amount,
    currency: 'USD',
  });
}

const meterReading = {
  userId: 'user-1',
  resource: MeteredResource.RESOURCE_MINUTES,
  units: 12,
  unitPrice: 5,
  usageReference: 'session-4711-minutes-12',
};

describe('MeteredUsageService', () => {
  beforeEach(() => {
    (createTransport as jest.Mock).mockReset();
  });

  function seedPriorUsage(harness: any, amounts: number[]) {
    const now = Date.now();
    amounts.forEach((amount, index) => {
      harness.usageEvents.rows.push({
        id: `prior-${index}`,
        userId: 'user-1',
        resource: MeteredResource.RESOURCE_MINUTES,
        units: 1,
        unitPrice: amount,
        amount,
        currency: 'USD',
        usageReference: `prior-${index}`,
        ledgerTransactionId: `prior-transaction-${index}`,
        createdAt: new Date(now - (70 + index * 10) * 60_000),
      });
    });
  }

  it('prices the reading and charges it against the credit balance', async () => {
    const { usage, credits, harness } = build();
    await fund(credits, 1000);

    const { event, charged } = await usage.recordUsage(meterReading);

    expect(charged).toBe(true);
    expect(event.amount).toBe(60);
    expect((await credits.getBalance('user-1')).balance).toBe(940);

    const revenue = await credits.getSystemAccount(LedgerAccountKind.REVENUE);
    expect(harness.balanceOf(revenue.id)).toBe(60);

    // The charge is linked to the usage record, both ways.
    const transaction = harness.transactions.rows.find(
      (row) => row.id === event.ledgerTransactionId,
    );
    expect(transaction.reference).toBe(
      `charge:usage:${meterReading.usageReference}`,
    );
    expect(transaction.metadata).toMatchObject({
      resource: MeteredResource.RESOURCE_MINUTES,
      units: 12,
      unitPrice: 5,
    });
  });

  it('charges a retried meter reading exactly once', async () => {
    const { usage, credits, harness } = build();
    await fund(credits, 1000);

    const first = await usage.recordUsage(meterReading);
    const retry = await usage.recordUsage(meterReading);

    expect(first.charged).toBe(true);
    expect(retry.charged).toBe(false);
    expect(retry.event.id).toBe(first.event.id);
    expect(harness.usageEvents.rows).toHaveLength(1);
    expect((await credits.getBalance('user-1')).balance).toBe(940);
  });

  /**
   * The crash between the two writes: the ledger already holds the charge
   * but the usage record was lost. A retry must reconcile to one charge and
   * one record, not two of either.
   */
  it('recovers when the usage record was lost after the charge was posted', async () => {
    const { usage, credits, harness } = build();
    await fund(credits, 1000);
    await usage.recordUsage(meterReading);

    // Simulate the lost write.
    harness.usageEvents.rows.splice(0, harness.usageEvents.rows.length);
    const retry = await usage.recordUsage(meterReading);

    expect(retry.charged).toBe(false);
    expect(harness.usageEvents.rows).toHaveLength(1);
    expect((await credits.getBalance('user-1')).balance).toBe(940);
  });

  it('surfaces an insufficient balance rather than metering for free', async () => {
    const { usage, credits, harness } = build();
    await fund(credits, 10);

    await expect(usage.recordUsage(meterReading)).rejects.toThrow(
      InsufficientCreditException,
    );
    expect(harness.usageEvents.rows).toHaveLength(0);
    expect((await credits.getBalance('user-1')).balance).toBe(10);
  });

  it('rejects a non-positive quantity or price', async () => {
    const { usage } = build();
    for (const patch of [
      { units: 0 },
      { units: -1 },
      { units: 1.5 },
      { unitPrice: 0 },
      { unitPrice: -5 },
    ]) {
      await expect(
        usage.recordUsage({ ...meterReading, ...patch }),
      ).rejects.toThrow(BadRequestException);
    }
  });

  it('requires a usage reference', async () => {
    const { usage } = build();
    await expect(
      usage.recordUsage({ ...meterReading, usageReference: '  ' }),
    ).rejects.toThrow(/usage reference is required/);
  });

  it('accumulates several readings into the revenue account', async () => {
    const { usage, credits, harness } = build();
    await fund(credits, 1000);

    await usage.recordUsage(meterReading);
    await usage.recordUsage({
      ...meterReading,
      resource: MeteredResource.PRINTING,
      units: 20,
      unitPrice: 2,
      usageReference: 'print-job-1',
    });
    await usage.recordUsage({
      ...meterReading,
      resource: MeteredResource.MEETING_ROOM_OVERAGE,
      units: 15,
      unitPrice: 10,
      usageReference: 'overage-1',
    });

    const revenue = await credits.getSystemAccount(LedgerAccountKind.REVENUE);
    expect(harness.balanceOf(revenue.id)).toBe(60 + 40 + 150);
    expect((await credits.getBalance('user-1')).balance).toBe(1000 - 250);
    expect(await usage.listForUser('user-1')).toHaveLength(3);
  });

  it('does not alert when the current window is below the spike threshold', async () => {
    const { usage, credits, harness, metrics } = build({
      CREDITS_USAGE_SPIKE_WINDOW_MINUTES: 60,
      CREDITS_USAGE_SPIKE_MULTIPLIER: 5,
      CREDITS_USAGE_SPIKE_MIN_AMOUNT: 100,
      CREDITS_USAGE_SPIKE_MIN_SAMPLES: 3,
    });
    seedPriorUsage(harness, [100, 100, 100]);
    await fund(credits, 5000);

    await usage.recordUsage({
      ...meterReading,
      units: 80,
      usageReference: 'below-spike',
    });

    expect(metrics.recordCreditUsageSpike).not.toHaveBeenCalled();
  });

  it('does not alert without the minimum number of prior samples', async () => {
    const { usage, credits, harness, metrics } = build({
      CREDITS_USAGE_SPIKE_MIN_AMOUNT: 100,
      CREDITS_USAGE_SPIKE_MIN_SAMPLES: 3,
    });
    seedPriorUsage(harness, [10, 10]);
    await fund(credits, 5000);

    await usage.recordUsage({
      ...meterReading,
      units: 200,
      usageReference: 'insufficient-history',
    });

    expect(metrics.recordCreditUsageSpike).not.toHaveBeenCalled();
  });

  it('increments the usage-spike counter when a sufficiently large spike is detected', async () => {
    const { usage, credits, harness, metrics } = build({
      CREDITS_USAGE_SPIKE_MIN_AMOUNT: 100,
      CREDITS_USAGE_SPIKE_MIN_SAMPLES: 3,
    });
    seedPriorUsage(harness, [10, 10, 10]);
    await fund(credits, 5000);

    await usage.recordUsage({
      ...meterReading,
      units: 200,
      usageReference: 'large-spike',
    });

    expect(metrics.recordCreditUsageSpike).toHaveBeenCalledWith(
      MeteredResource.RESOURCE_MINUTES,
    );
  });

  it('does not let a failing SMTP alert break usage recording', async () => {
    const sendMail = jest.fn().mockRejectedValue(new Error('smtp unavailable'));
    (createTransport as jest.Mock).mockReturnValue({ sendMail });
    const { usage, credits, harness, metrics } = build({
      CREDITS_USAGE_SPIKE_MIN_AMOUNT: 100,
      CREDITS_USAGE_SPIKE_MIN_SAMPLES: 3,
      SMTP_HOST: 'smtp.example.test',
      SMTP_USER: 'smtp-user',
      SMTP_PASS: 'smtp-pass',
      SMTP_FROM_EMAIL: 'alerts@example.test',
      SUPPORT_EMAIL: 'support@example.test',
    });
    seedPriorUsage(harness, [10, 10, 10]);
    await fund(credits, 5000);

    await expect(
      usage.recordUsage({
        ...meterReading,
        units: 200,
        usageReference: 'smtp-failure-spike',
      }),
    ).resolves.toMatchObject({ charged: true });
    expect(metrics.recordCreditUsageSpike).toHaveBeenCalled();
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect((await credits.getBalance('user-1')).balance).toBe(4000);
  });
});
