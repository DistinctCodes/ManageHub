import { CreditsService } from './credits.service';
import { LedgerService } from './ledger.service';
import { RevenueSplitService } from './revenue-split.service';
import { SettlementService } from './settlement.service';
import { LedgerAccountKind } from './enums/ledger-account-kind.enum';
import { LedgerEntryDirection } from './enums/ledger-entry-direction.enum';
import { LedgerTransactionKind } from './enums/ledger-transaction-kind.enum';
import { SettlementBatchMode } from './enums/settlement-batch-mode.enum';
import { SettlementBatchStatus } from './enums/settlement-batch-status.enum';
import { SettlementPayoutStatus } from './enums/settlement-payout-status.enum';
import {
  PayoutStatus,
  SubmitPayoutInput,
} from './interfaces/external-payout-rail.interface';
import {
  createLedgerHarness,
  fakeConfigService,
} from './testing/in-memory-ledger';

/**
 * A rail whose reported status is under the test's control — the point
 * being that submitting and confirming are separate events, and
 * settlement must only ever believe the second one.
 */
function fakeRail() {
  const submissions: SubmitPayoutInput[] = [];
  let status: PayoutStatus = 'pending';
  let submitError: Error | null = null;
  let statusError: Error | null = null;

  return {
    submissions,
    setStatus(next: PayoutStatus) {
      status = next;
    },
    failSubmitWith(error: Error | null) {
      submitError = error;
    },
    failStatusWith(error: Error | null) {
      statusError = error;
    },
    submitPayout: jest.fn(async (input: SubmitPayoutInput) => {
      if (submitError) {
        throw submitError;
      }
      submissions.push(input);
      return { reference: `chain-ref:${input.idempotencyKey}` };
    }),
    getPayoutStatus: jest.fn(async () => {
      if (statusError) {
        throw statusError;
      }
      return status;
    }),
  };
}

/**
 * `railOverride: null` builds a service with NO payout rail — note that it
 * has to be an explicit null, since passing `undefined` would fall back to
 * the default parameter.
 */
function build(
  config: Record<string, unknown> = {},
  railOverride?: ReturnType<typeof fakeRail> | null,
) {
  const rail = railOverride === undefined ? fakeRail() : railOverride;
  const harness = createLedgerHarness();
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
  const settlement = new SettlementService(
    harness.batches as any,
    harness.payouts as any,
    harness.accounts as any,
    harness.entries as any,
    ledger,
    splits,
    fakeConfigService({
      CREDITS_SETTLEMENT_MIN_PAYOUT: 1,
      CREDITS_SETTLEMENT_MAX_PAYOUT_ATTEMPTS: 3,
      ...config,
    }),
    rail as any,
    {
      recordReconciliationPass: jest.fn(),
      recordSettlementPayoutAttempt: jest.fn(),
      recordSettlementPayoutFailure: jest.fn(),
    } as any,
  );

  async function credit(accountId: string, amount: number, reference: string) {
    const treasury = await credits.getSystemAccount(
      LedgerAccountKind.TREASURY,
      'USD',
    );
    await ledger.post({
      reference,
      kind: LedgerTransactionKind.ADJUSTMENT,
      currency: 'USD',
      legs: [
        {
          accountId: treasury.id,
          direction: LedgerEntryDirection.DEBIT,
          amount,
        },
        { accountId, direction: LedgerEntryDirection.CREDIT, amount },
      ],
    });
  }

  return { harness, ledger, credits, splits, settlement, rail, credit };
}

async function payableOperator(credits: CreditsService, hubId = 'hub-1') {
  return credits.getPayableAccount(
    LedgerAccountKind.HUB_OPERATOR,
    hubId,
    'USD',
    'GOPERATORADDRESS',
  );
}

describe('SettlementService — NET_PAYABLE batches', () => {
  it('nets an account’s balance into a single pending payout', async () => {
    const { credits, settlement, harness, credit } = build();
    const operator = await payableOperator(credits);
    await credit(operator.id, 400, 'movement-1');
    await credit(operator.id, 600, 'movement-2');

    const batch = await settlement.createNetPayableBatch('USD');

    expect(batch).not.toBeNull();
    expect(batch!.mode).toBe(SettlementBatchMode.NET_PAYABLE);
    expect(batch!.totalAmount).toBe(1000);
    // Two micro-movements in, one on-chain transfer out — the whole point.
    expect(batch!.claimedEntryCount).toBe(2);

    const payouts = await harness.payouts.find({
      where: { batchId: batch!.id },
    });
    expect(payouts).toHaveLength(1);
    expect(payouts[0]).toMatchObject({
      amount: 1000,
      externalAddress: 'GOPERATORADDRESS',
      status: SettlementPayoutStatus.PENDING,
    });
  });

  it('creates nothing when there is no payable balance', async () => {
    const { credits, settlement } = build();
    await payableOperator(credits);
    expect(await settlement.createNetPayableBatch('USD')).toBeNull();
  });

  it('ignores an account with no payout address — nothing to move off-platform', async () => {
    const { credits, settlement, credit } = build();
    const internalOnly = await credits.getSystemAccount(
      LedgerAccountKind.PLATFORM_FEE,
      'USD',
    );
    await credit(internalOnly.id, 5000, 'movement-1');
    expect(await settlement.createNetPayableBatch('USD')).toBeNull();
  });

  it('skips a frozen account', async () => {
    const { credits, ledger, settlement, credit } = build();
    const operator = await payableOperator(credits);
    await credit(operator.id, 1000, 'movement-1');
    await ledger.updateAccountPolicy(operator.id, { frozen: true });

    expect(await settlement.createNetPayableBatch('USD')).toBeNull();
  });

  /**
   * The in-flight guard. Amounts are derived from the account balance, so
   * a second batch created while the first payout is still unresolved
   * would commit the same balance twice.
   */
  it('refuses a second batch while an account has an in-flight payout', async () => {
    const { credits, settlement, credit } = build();
    const operator = await payableOperator(credits);
    await credit(operator.id, 1000, 'movement-1');

    expect(await settlement.createNetPayableBatch('USD')).not.toBeNull();
    expect(await settlement.createNetPayableBatch('USD')).toBeNull();
  });
});

describe('SettlementService — executing a batch', () => {
  it('submits, then only settles once the rail confirms from fresh state', async () => {
    const { credits, settlement, harness, rail, credit } = build();
    const operator = await payableOperator(credits);
    await credit(operator.id, 1000, 'movement-1');
    const batch = await settlement.createNetPayableBatch('USD');

    // Pass one: submitted, but the rail still says pending.
    const afterSubmit = await settlement.executeBatch(batch!.id);
    expect(rail!.submitPayout).toHaveBeenCalledTimes(1);
    expect(afterSubmit.status).toBe(SettlementBatchStatus.IN_PROGRESS);

    let payout = (
      await harness.payouts.find({ where: { batchId: batch!.id } })
    )[0];
    expect(payout.status).toBe(SettlementPayoutStatus.SUBMITTED);
    expect(payout.onChainReference).toBe(`chain-ref:${payout.idempotencyKey}`);
    // Crucially: nothing settled, and the balance is still shown as owed.
    expect(harness.balanceOf(operator.id)).toBe(1000);
    expect(
      harness.entries.rows.filter(
        (entry) => entry.settlementBatchId === batch!.id && entry.settledAt,
      ),
    ).toHaveLength(0);

    // Pass two: the rail confirms.
    rail!.setStatus('confirmed');
    const settled = await settlement.executeBatch(batch!.id);

    expect(settled.status).toBe(SettlementBatchStatus.SETTLED);
    payout = (await harness.payouts.find({ where: { batchId: batch!.id } }))[0];
    expect(payout.status).toBe(SettlementPayoutStatus.CONFIRMED);
    expect(payout.ledgerTransactionId).toBeTruthy();

    // The drawdown is posted, treasury is the counterparty, and every
    // claimed entry now carries a settled marker.
    expect(harness.balanceOf(operator.id)).toBe(0);
    const treasury = await credits.getSystemAccount(LedgerAccountKind.TREASURY);
    expect(harness.balanceOf(treasury.id)).toBe(0);
    expect(
      harness.entries.rows.filter(
        (entry) => entry.settlementBatchId === batch!.id && !entry.settledAt,
      ),
    ).toHaveLength(0);
  });

  it('leaves the ledger untouched when the on-chain leg fails', async () => {
    const { credits, settlement, harness, rail, credit } = build({
      CREDITS_SETTLEMENT_MAX_PAYOUT_ATTEMPTS: 1,
    });
    const operator = await payableOperator(credits);
    await credit(operator.id, 1000, 'movement-1');
    const batch = await settlement.createNetPayableBatch('USD');

    rail!.failSubmitWith(new Error('escrow simulation failed'));
    const result = await settlement.executeBatch(batch!.id);

    expect(result.status).toBe(SettlementBatchStatus.FAILED);
    const payout = (
      await harness.payouts.find({ where: { batchId: batch!.id } })
    )[0];
    expect(payout.status).toBe(SettlementPayoutStatus.FAILED);
    expect(payout.lastError).toMatch(/escrow simulation failed/);

    // Never "assume success": the balance is still owed and no entry is
    // marked settled.
    expect(harness.balanceOf(operator.id)).toBe(1000);
    expect(
      harness.entries.rows.filter((entry) => entry.settledAt),
    ).toHaveLength(0);
  });

  it('keeps a payout retryable until its attempt budget is spent', async () => {
    const { credits, settlement, harness, rail, credit } = build({
      CREDITS_SETTLEMENT_MAX_PAYOUT_ATTEMPTS: 3,
    });
    const operator = await payableOperator(credits);
    await credit(operator.id, 1000, 'movement-1');
    const batch = await settlement.createNetPayableBatch('USD');
    rail!.failSubmitWith(new Error('rpc unreachable'));

    await settlement.executeBatch(batch!.id);
    let payout = (
      await harness.payouts.find({ where: { batchId: batch!.id } })
    )[0];
    expect(payout).toMatchObject({
      status: SettlementPayoutStatus.PENDING,
      attempts: 1,
    });

    await settlement.executeBatch(batch!.id);
    await settlement.executeBatch(batch!.id);
    payout = (await harness.payouts.find({ where: { batchId: batch!.id } }))[0];
    expect(payout).toMatchObject({
      status: SettlementPayoutStatus.FAILED,
      attempts: 3,
    });
  });

  it('treats an unreachable rail as indeterminate, not as failure', async () => {
    const { credits, settlement, harness, rail, credit } = build();
    const operator = await payableOperator(credits);
    await credit(operator.id, 1000, 'movement-1');
    const batch = await settlement.createNetPayableBatch('USD');
    await settlement.executeBatch(batch!.id);

    rail!.failStatusWith(new Error('rpc timeout'));
    await settlement.executeBatch(batch!.id);

    const payout = (
      await harness.payouts.find({ where: { batchId: batch!.id } })
    )[0];
    expect(payout.status).toBe(SettlementPayoutStatus.SUBMITTED);
    expect(harness.balanceOf(operator.id)).toBe(1000);
  });

  it('marks a payout failed when the rail reports the transfer failed', async () => {
    const { credits, settlement, harness, rail, credit } = build();
    const operator = await payableOperator(credits);
    await credit(operator.id, 1000, 'movement-1');
    const batch = await settlement.createNetPayableBatch('USD');
    await settlement.executeBatch(batch!.id);

    rail!.setStatus('failed');
    const result = await settlement.executeBatch(batch!.id);

    expect(result.status).toBe(SettlementBatchStatus.FAILED);
    expect(harness.balanceOf(operator.id)).toBe(1000);
  });

  it('keeps payouts pending, and says so, when no rail is configured', async () => {
    const { credits, settlement, harness, credit } = build({}, null);
    const operator = await payableOperator(credits);
    await credit(operator.id, 1000, 'movement-1');

    const summary = await settlement.runSettlement();

    expect(summary.payoutsAwaitingRail).toBeGreaterThan(0);
    expect(summary.notes.join(' ')).toMatch(/no external payout rail/i);
    expect(harness.payouts.rows[0].status).toBe(SettlementPayoutStatus.PENDING);
    expect(harness.balanceOf(operator.id)).toBe(1000);
  });
});

/**
 * Issue #1575's idempotency acceptance criterion: the batch job must be
 * safe to re-run mid-failure without double-paying any recipient.
 */
describe('SettlementService — re-running a batch never double-pays', () => {
  it('submits once however many times the batch is executed', async () => {
    const { credits, settlement, rail, credit } = build();
    const operator = await payableOperator(credits);
    await credit(operator.id, 1000, 'movement-1');
    const batch = await settlement.createNetPayableBatch('USD');

    await settlement.executeBatch(batch!.id);
    await settlement.executeBatch(batch!.id);
    await settlement.executeBatch(batch!.id);

    expect(rail!.submitPayout).toHaveBeenCalledTimes(1);
  });

  it('posts the ledger drawdown once however many times it is confirmed', async () => {
    const { credits, settlement, harness, rail, credit } = build();
    const operator = await payableOperator(credits);
    await credit(operator.id, 1000, 'movement-1');
    const batch = await settlement.createNetPayableBatch('USD');
    await settlement.executeBatch(batch!.id);

    rail!.setStatus('confirmed');
    await settlement.executeBatch(batch!.id);
    // A second (and third) confirmation, as a resumed run would produce.
    await settlement.executeBatch(batch!.id);
    await settlement.executeBatch(batch!.id);

    const settlementTransactions = harness.transactions.rows.filter(
      (transaction) => transaction.kind === LedgerTransactionKind.SETTLEMENT,
    );
    expect(settlementTransactions).toHaveLength(1);
    expect(harness.balanceOf(operator.id)).toBe(0);
    expect(harness.balanceOf(operator.id)).toBe(
      harness.derivedBalanceOf(operator.id),
    );
  });

  /**
   * The crash the issue describes: the transfer reached the rail but our
   * record of it did not. Re-running re-submits with the SAME idempotency
   * key, which is what the rail dedupes on — so the recipient is paid once
   * even though we asked twice.
   */
  it('re-submits with the same idempotency key after losing the submission record', async () => {
    const { credits, settlement, harness, rail, credit } = build();
    const operator = await payableOperator(credits);
    await credit(operator.id, 1000, 'movement-1');
    const batch = await settlement.createNetPayableBatch('USD');

    await settlement.executeBatch(batch!.id);
    // Simulate the crash: the payout row never recorded the submission.
    await harness.payouts.update(
      { batchId: batch!.id },
      {
        status: SettlementPayoutStatus.PENDING,
        onChainReference: null,
        attempts: 0,
      },
    );
    await settlement.executeBatch(batch!.id);

    expect(rail!.submissions).toHaveLength(2);
    expect(rail!.submissions[0].idempotencyKey).toBe(
      rail!.submissions[1].idempotencyKey,
    );

    rail!.setStatus('confirmed');
    await settlement.executeBatch(batch!.id);
    expect(
      harness.transactions.rows.filter(
        (transaction) => transaction.kind === LedgerTransactionKind.SETTLEMENT,
      ),
    ).toHaveLength(1);
    expect(harness.balanceOf(operator.id)).toBe(0);
  });

  it('retries only the failed payouts, reusing their keys', async () => {
    const { credits, settlement, harness, rail, credit } = build({
      CREDITS_SETTLEMENT_MAX_PAYOUT_ATTEMPTS: 1,
    });
    const operator = await payableOperator(credits);
    await credit(operator.id, 1000, 'movement-1');
    const batch = await settlement.createNetPayableBatch('USD');

    rail!.failSubmitWith(new Error('boom'));
    await settlement.executeBatch(batch!.id);
    const failedKey = harness.payouts.rows[0].idempotencyKey;

    rail!.failSubmitWith(null);
    rail!.setStatus('confirmed');
    // A retry re-submits (one step per pass); the pass after that is what
    // sees the confirmation and settles.
    const retried = await settlement.retryBatch(batch!.id);
    expect(retried.status).toBe(SettlementBatchStatus.IN_PROGRESS);
    expect(await settlement.executeBatch(batch!.id)).toMatchObject({
      status: SettlementBatchStatus.SETTLED,
    });

    // The same key the failed attempt used — so a transfer that actually
    // did land is deduped by the rail rather than repeated.
    expect(rail!.submissions).toHaveLength(1);
    expect(rail!.submissions[0].idempotencyKey).toBe(failedKey);
  });

  it('does nothing further once a batch is settled', async () => {
    const { credits, settlement, harness, rail, credit } = build();
    const operator = await payableOperator(credits);
    await credit(operator.id, 1000, 'movement-1');
    const batch = await settlement.createNetPayableBatch('USD');
    await settlement.executeBatch(batch!.id);
    rail!.setStatus('confirmed');
    await settlement.executeBatch(batch!.id);

    const transactionsBefore = harness.transactions.rows.length;
    const statusChecksBefore = rail!.getPayoutStatus.mock.calls.length;

    await settlement.executeBatch(batch!.id);

    expect(harness.transactions.rows.length).toBe(transactionsBefore);
    // A settled batch short-circuits: it does not even ask the rail again.
    expect(rail!.getPayoutStatus.mock.calls.length).toBe(statusChecksBefore);
  });
});

describe('SettlementService — DISTRIBUTION batches', () => {
  async function withConfig() {
    const context = build();
    const platform = await context.credits.getSystemAccount(
      LedgerAccountKind.PLATFORM_FEE,
      'USD',
    );
    const config = await context.splits.createConfig({
      name: 'hub-split',
      recipients: [
        { label: 'platform fee', basisPoints: 1500, accountId: platform.id },
        {
          label: 'partner payout',
          basisPoints: 8500,
          externalAddress: 'GPARTNERADDRESS',
        },
      ],
    });
    const revenue = await context.credits.getSystemAccount(
      LedgerAccountKind.REVENUE,
      'USD',
    );
    return { ...context, platform, config, revenue };
  }

  it('posts internal shares immediately and leaves external ones to the rail', async () => {
    const { settlement, harness, credit, platform, revenue } =
      await withConfig();
    await credit(revenue.id, 10_000, 'charges-1');

    const batch = await settlement.createDistributionBatch('USD', 'hub-split');

    expect(batch!.mode).toBe(SettlementBatchMode.DISTRIBUTION);
    expect(batch!.totalAmount).toBe(10_000);

    const payouts = await harness.payouts.find({
      where: { batchId: batch!.id },
    });
    expect(payouts).toHaveLength(2);
    const internal = payouts.find((payout) => !payout.externalAddress)!;
    const external = payouts.find((payout) => payout.externalAddress)!;
    expect(internal).toMatchObject({
      amount: 1500,
      status: SettlementPayoutStatus.CONFIRMED,
    });
    expect(external).toMatchObject({
      amount: 8500,
      status: SettlementPayoutStatus.PENDING,
    });

    // The internal share has already moved; the external one has not.
    expect(harness.balanceOf(platform.id)).toBe(1500);
    expect(harness.balanceOf(revenue.id)).toBe(8500);
  });

  it('completes the distribution once the external leg confirms', async () => {
    const { settlement, harness, rail, credit, revenue, credits } =
      await withConfig();
    await credit(revenue.id, 10_000, 'charges-1');
    const batch = await settlement.createDistributionBatch('USD', 'hub-split');

    await settlement.executeBatch(batch!.id);
    rail!.setStatus('confirmed');
    const settled = await settlement.executeBatch(batch!.id);

    expect(settled.status).toBe(SettlementBatchStatus.SETTLED);
    expect(harness.balanceOf(revenue.id)).toBe(0);
    const treasury = await credits.getSystemAccount(LedgerAccountKind.TREASURY);
    // Treasury started at -10000 (it funded the revenue credit) and is
    // credited back the 8500 that actually left the platform.
    expect(harness.balanceOf(treasury.id)).toBe(-1500);
    expect(harness.balanceOf(revenue.id)).toBe(
      harness.derivedBalanceOf(revenue.id),
    );
  });

  it('does not re-distribute an already-distributed balance', async () => {
    const { settlement, credit, revenue } = await withConfig();
    await credit(revenue.id, 10_000, 'charges-1');

    expect(
      await settlement.createDistributionBatch('USD', 'hub-split'),
    ).not.toBeNull();
    // The revenue account still holds the undistributed external share,
    // but it has an in-flight payout — so nothing is committed twice.
    expect(
      await settlement.createDistributionBatch('USD', 'hub-split'),
    ).toBeNull();
  });

  it('skips a missing or inactive config instead of guessing', async () => {
    const { settlement, splits, config, credit, revenue } = await withConfig();
    await credit(revenue.id, 10_000, 'charges-1');

    const missing = await settlement.createDistributionBatch('USD', 'nope');
    expect(missing).toBeNull();

    await splits.setActive(config.id, false);
    expect(
      await settlement.createDistributionBatch('USD', 'hub-split'),
    ).toBeNull();
  });
});

describe('SettlementService — admin visibility and recovery', () => {
  it('exposes entries in, recipients out, and on-chain references', async () => {
    const { credits, settlement, rail, credit } = build();
    const operator = await payableOperator(credits);
    await credit(operator.id, 400, 'movement-1');
    await credit(operator.id, 600, 'movement-2');
    const batch = await settlement.createNetPayableBatch('USD');
    await settlement.executeBatch(batch!.id);
    rail!.setStatus('confirmed');
    await settlement.executeBatch(batch!.id);

    const breakdown = await settlement.getBatchBreakdown(batch!.id);

    expect(breakdown.batch.status).toBe(SettlementBatchStatus.SETTLED);
    expect(breakdown.payouts).toHaveLength(1);
    expect(breakdown.payouts[0].amount).toBe(1000);
    // The two claimed movements plus the two legs of the settlement
    // drawdown this batch posted.
    expect(breakdown.entries.length).toBe(4);
    expect(breakdown.onChainReferences).toHaveLength(1);
    expect(breakdown.onChainReferences[0].reference).toMatch(/^chain-ref:/);
  });

  it('releases the claims of an abandoned batch without posting anything', async () => {
    const { credits, settlement, harness, rail, credit } = build({
      CREDITS_SETTLEMENT_MAX_PAYOUT_ATTEMPTS: 1,
    });
    const operator = await payableOperator(credits);
    await credit(operator.id, 1000, 'movement-1');
    const batch = await settlement.createNetPayableBatch('USD');
    rail!.failSubmitWith(new Error('wrong address'));
    await settlement.executeBatch(batch!.id);

    const transactionsBefore = harness.transactions.rows.length;
    const abandoned = await settlement.abandonBatch(
      batch!.id,
      'operator address was decommissioned',
    );

    expect(abandoned.status).toBe(SettlementBatchStatus.ABANDONED);
    expect(harness.transactions.rows.length).toBe(transactionsBefore);
    // The claim is released, so the balance is available to a future batch.
    expect(
      harness.entries.rows.filter(
        (entry) => entry.settlementBatchId === batch!.id,
      ),
    ).toHaveLength(0);
    expect(harness.balanceOf(operator.id)).toBe(1000);
    expect(await settlement.createNetPayableBatch('USD')).not.toBeNull();
  });

  it('resumes open batches before creating new work', async () => {
    const { credits, settlement, rail, credit } = build();
    const operator = await payableOperator(credits);
    await credit(operator.id, 1000, 'movement-1');
    const batch = await settlement.createNetPayableBatch('USD');

    rail!.setStatus('confirmed');

    // The first pass picks the already-open batch up and submits it, and
    // creates no competing batch for the same account.
    const first = await settlement.runSettlement();
    expect(first.batchesExecuted).toBeGreaterThanOrEqual(1);
    expect(first.batchesCreated).toBe(0);
    expect(first.payoutsSubmitted).toBe(1);

    // The next pass sees the confirmation and finishes it.
    const second = await settlement.runSettlement();
    expect(second.payoutsConfirmed).toBe(1);
    expect(second.entriesSettled).toBe(1);
    const resumed = await settlement.getBatch(batch!.id);
    expect(resumed.status).toBe(SettlementBatchStatus.SETTLED);
  });
});
