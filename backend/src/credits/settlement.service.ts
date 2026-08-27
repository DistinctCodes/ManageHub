import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  In,
  IsNull,
  LessThanOrEqual,
  Not,
  Repository,
} from 'typeorm';
import { LedgerAccount } from './entities/ledger-account.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { SettlementBatch } from './entities/settlement-batch.entity';
import { SettlementPayout } from './entities/settlement-payout.entity';
import { LedgerAccountKind } from './enums/ledger-account-kind.enum';
import { LedgerEntryDirection } from './enums/ledger-entry-direction.enum';
import { LedgerTransactionKind } from './enums/ledger-transaction-kind.enum';
import { SettlementBatchMode } from './enums/settlement-batch-mode.enum';
import { SettlementBatchStatus } from './enums/settlement-batch-status.enum';
import { SettlementPayoutStatus } from './enums/settlement-payout-status.enum';
import { LedgerService } from './ledger.service';
import { RevenueSplitService } from './revenue-split.service';
import { EXTERNAL_PAYOUT_RAIL } from './credits.tokens';
import { ExternalPayoutRail } from './interfaces/external-payout-rail.interface';
import { MetricsService } from '../common/metrics.service';
import { withRequestId } from '../common/request-context';

/**
 * Serializes settlement batch CREATION platform-wide. Netting reads an
 * account's balance and then commits payouts against it, so two runs
 * overlapping on the same account would each net the same balance. The
 * per-account in-flight guard below already refuses the second batch, but
 * taking this transaction-scoped advisory lock first means the two runs
 * never even interleave — much easier to reason about than a retry loop.
 */
const SETTLEMENT_CREATE_LOCK_KEY = 1575000001;

const NON_TERMINAL_PAYOUT_STATUSES = [
  SettlementPayoutStatus.PENDING,
  SettlementPayoutStatus.SUBMITTED,
];

const OPEN_BATCH_STATUSES = [
  SettlementBatchStatus.PENDING,
  SettlementBatchStatus.IN_PROGRESS,
];

export interface SettlementRunSummary {
  batchesCreated: number;
  batchesExecuted: number;
  payoutsSubmitted: number;
  payoutsConfirmed: number;
  payoutsFailed: number;
  payoutsAwaitingRail: number;
  entriesSettled: number;
  notes: string[];
}

export interface SettlementBatchBreakdown {
  batch: SettlementBatch;
  payouts: SettlementPayout[];
  /** The claimed ledger entries — the "entries in" side of the batch. */
  entries: LedgerEntry[];
  /** On-chain references for the payouts that have one, for quick lookup. */
  onChainReferences: Array<{ payoutId: string; reference: string }>;
}

/**
 * Batch settlement (issue #1575): the job that turns many small internal
 * ledger movements into at most one on-chain transfer per recipient.
 *
 * ## What makes it safe to crash
 *
 * Three separate guards, none of which relies on the previous run having
 * finished cleanly:
 *
 *  1. **Amounts come from account balances, not from a running tally.** A
 *     payout that never happened leaves the balance untouched, so the next
 *     run simply sees the same amount still owed. Nothing has to be
 *     "rolled back".
 *  2. **One in-flight payout per account.** A batch is never created for
 *     an account that already has a PENDING or SUBMITTED payout, so the
 *     same balance can never be committed to two batches.
 *  3. **Per-payout idempotency keys.** Re-executing a batch hands the rail
 *     the same key, which the rail must dedupe on — so a crash between
 *     "submitted" and "recorded as submitted" cannot pay twice.
 *
 * And the rule those three exist to protect: **a submission is not a
 * settlement.** The ledger drawdown and the per-entry `settledAt` marker
 * are written only after the rail confirms the payout from fresh state. If
 * the on-chain leg fails, the ledger still shows the balance as owed —
 * never as paid.
 */
@Injectable()
export class SettlementService implements OnModuleInit {
  private readonly logger = new Logger(SettlementService.name);

  /**
   * Fail-fast startup validation for CREDITS_SETTLEMENT_SPLIT_CONFIG
   * (issue #1613). When settlement is enabled and a split config is
   * referenced by name, we confirm that config actually exists (and is
   * usable) at boot time - otherwise a typo or a deleted config would only
   * surface hours later on the next cron tick, silently skipping
   * distribution.
   */
  async onModuleInit(): Promise<void> {
    const name = this.config.get<string>('CREDITS_SETTLEMENT_SPLIT_CONFIG');
    if (!name) return;
    if (
      this.config.get<string>('CREDITS_SETTLEMENT_ENABLED', 'true') !== 'true'
    ) {
      return;
    }
    const config = await this.splits.findConfigByName(name);
    if (!config) {
      throw new Error(
        `CREDITS_SETTLEMENT_SPLIT_CONFIG="${name}" does not match any ` +
          'RevenueSplitConfig. Fix the environment variable before starting.',
      );
    }
  }

  constructor(
    @InjectRepository(SettlementBatch)
    private readonly batchRepository: Repository<SettlementBatch>,
    @InjectRepository(SettlementPayout)
    private readonly payoutRepository: Repository<SettlementPayout>,
    @InjectRepository(LedgerAccount)
    private readonly accountRepository: Repository<LedgerAccount>,
    @InjectRepository(LedgerEntry)
    private readonly entryRepository: Repository<LedgerEntry>,
    private readonly ledger: LedgerService,
    private readonly splits: RevenueSplitService,
    private readonly config: ConfigService,
    @Optional()
    @Inject(EXTERNAL_PAYOUT_RAIL)
    private readonly payoutRail: ExternalPayoutRail | undefined,
    private readonly metrics: MetricsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron(): Promise<void> {
    const started = Date.now();
    if (
      this.config.get<string>('CREDITS_SETTLEMENT_ENABLED', 'true') !== 'true'
    ) {
      return;
    }
    const summary = await this.runSettlement();
    this.metrics.recordReconciliationPass(Date.now() - started);
    this.logger.log(withRequestId(`Settlement pass: ${JSON.stringify(summary)}`));
  }

  /**
   * The directly-testable core. Resumes anything already open BEFORE
   * creating new work — a batch left mid-flight by a crash or a restart is
   * always finished (or at least advanced) first, so a stuck payout can
   * never be lapped by a fresh batch for the same account.
   */
  async runSettlement(now: Date = new Date()): Promise<SettlementRunSummary> {
    const summary = this.emptySummary();

    const open = await this.batchRepository.find({
      where: { status: In(OPEN_BATCH_STATUSES) },
      order: { createdAt: 'ASC' },
    });
    for (const batch of open) {
      await this.executeBatch(batch.id, now, summary);
    }

    for (const currency of await this.currenciesWithAccounts()) {
      const splitConfigName = this.config.get<string>(
        'CREDITS_SETTLEMENT_SPLIT_CONFIG',
      );
      if (splitConfigName) {
        const created = await this.createDistributionBatch(
          currency,
          splitConfigName,
          now,
          summary,
        );
        if (created) {
          summary.batchesCreated++;
          await this.executeBatch(created.id, now, summary);
        }
      }

      const netted = await this.createNetPayableBatch(currency, now, summary);
      if (netted) {
        summary.batchesCreated++;
        await this.executeBatch(netted.id, now, summary);
      }
    }

    return summary;
  }

  /**
   * Splits the platform revenue account's undistributed balance across a
   * RevenueSplitConfig. Internal shares are posted as ledger entries
   * immediately (they never leave the platform, so there is nothing to
   * wait for); external shares become payouts the rail has to confirm.
   */
  async createDistributionBatch(
    currency: string,
    splitConfigName: string,
    now: Date = new Date(),
    summary?: SettlementRunSummary,
  ): Promise<SettlementBatch | null> {
    const config = await this.splits.findConfigByName(splitConfigName);
    if (!config) {
      this.note(
        summary,
        `Split config "${splitConfigName}" not found — skipped distribution for ${currency}`,
      );
      return null;
    }
    if (!config.active) {
      this.note(
        summary,
        `Split config "${splitConfigName}" is inactive — skipped distribution for ${currency}`,
      );
      return null;
    }

    return this.batchRepository.manager.transaction(async (manager) => {
      await this.acquireCreateLock(manager);

      const source = await this.ledger.findAccount(
        { kind: LedgerAccountKind.REVENUE, ownerId: null, currency },
        manager,
      );
      if (!source) {
        return null;
      }
      if (await this.hasInFlightPayout(manager, source.id)) {
        this.note(
          summary,
          `Revenue account ${source.id} still has an in-flight payout — distribution deferred`,
        );
        return null;
      }

      const locked = await this.lockAccount(manager, source.id);
      const distributable = locked.balance;
      if (distributable < this.minPayout()) {
        return null;
      }

      const shares = this.splits.compute(config, distributable);
      const batch = await manager.getRepository(SettlementBatch).save(
        manager.getRepository(SettlementBatch).create({
          status: SettlementBatchStatus.PENDING,
          currency,
          mode: SettlementBatchMode.DISTRIBUTION,
          splitConfigId: config.id,
          periodEnd: now,
          totalAmount: distributable,
          notes: `Distribution of ${distributable} ${currency} via "${config.name}"`,
        }),
      );
      batch.claimedEntryCount = await this.claimEntries(
        manager,
        batch.id,
        [source.id],
        now,
      );

      const internal = shares.filter(
        (share) => share.recipient.accountId && share.amount > 0,
      );
      const external = shares.filter(
        (share) => !share.recipient.accountId && share.amount > 0,
      );

      const payoutRepository = manager.getRepository(SettlementPayout);
      const payouts: SettlementPayout[] = [];

      if (internal.length > 0) {
        const internalTotal = internal.reduce(
          (sum, share) => sum + share.amount,
          0,
        );
        const { transaction } = await this.ledger.post(
          {
            reference: `settlement:${batch.id}:internal`,
            kind: LedgerTransactionKind.REVENUE_SPLIT,
            currency,
            description: `Internal shares of settlement batch ${batch.id}`,
            metadata: { batchId: batch.id, configId: config.id },
            legs: [
              {
                // Stamped as settled by this batch: this leg IS the
                // drawdown, so no later batch should ever net it again.
                accountId: source.id,
                direction: LedgerEntryDirection.DEBIT,
                amount: internalTotal,
                settlementBatchId: batch.id,
                settledAt: now,
              },
              // Recipient credits are deliberately NOT stamped — an
              // operator's internal share is exactly what a later
              // NET_PAYABLE batch is supposed to pick up and pay out.
              ...internal.map((share) => ({
                accountId: share.recipient.accountId!,
                direction: LedgerEntryDirection.CREDIT,
                amount: share.amount,
              })),
            ],
          },
          manager,
        );

        for (const share of internal) {
          payouts.push(
            payoutRepository.create({
              batchId: batch.id,
              label: share.recipient.label,
              accountId: share.recipient.accountId,
              externalAddress: null,
              basisPoints: share.recipient.basisPoints,
              amount: share.amount,
              currency,
              // Internal shares are complete the moment they are posted —
              // there is no rail in the path to confirm.
              status: SettlementPayoutStatus.CONFIRMED,
              idempotencyKey: `settlement:${batch.id}:account:${share.recipient.accountId}`,
              attempts: 0,
              ledgerTransactionId: transaction.id,
              confirmedAt: now,
            }),
          );
        }
      }

      for (const share of external) {
        payouts.push(
          payoutRepository.create({
            batchId: batch.id,
            label: share.recipient.label,
            // The revenue account is what gets drawn down when this
            // off-platform payout is confirmed.
            accountId: source.id,
            externalAddress: share.recipient.externalAddress,
            basisPoints: share.recipient.basisPoints,
            amount: share.amount,
            currency,
            status: SettlementPayoutStatus.PENDING,
            idempotencyKey: `settlement:${batch.id}:address:${share.recipient.externalAddress}`,
            attempts: 0,
          }),
        );
      }

      if (payouts.length === 0) {
        // Nothing was actually apportionable (every share rounded to
        // zero) — release the claim rather than leaving a no-op batch
        // holding entries hostage.
        await this.releaseClaims(manager, batch.id);
        await manager.getRepository(SettlementBatch).remove(batch);
        return null;
      }

      await payoutRepository.save(payouts);
      await manager.getRepository(SettlementBatch).save(batch);
      return batch;
    });
  }

  /**
   * Nets each payable account's balance and pays that account's own
   * external address — one on-chain transfer per account per cycle,
   * however many micro-movements went into it.
   */
  async createNetPayableBatch(
    currency: string,
    now: Date = new Date(),
    summary?: SettlementRunSummary,
  ): Promise<SettlementBatch | null> {
    return this.batchRepository.manager.transaction(async (manager) => {
      await this.acquireCreateLock(manager);

      const candidates = await manager.getRepository(LedgerAccount).find({
        where: {
          currency,
          externalPayoutAddress: Not(IsNull()),
          frozen: false,
        },
      });

      const payable: Array<{ account: LedgerAccount; amount: number }> = [];
      for (const candidate of candidates) {
        if (await this.hasInFlightPayout(manager, candidate.id)) {
          this.note(
            summary,
            `Account ${candidate.id} still has an in-flight payout — netting deferred`,
          );
          continue;
        }
        const locked = await this.lockAccount(manager, candidate.id);
        if (locked.balance >= this.minPayout()) {
          payable.push({ account: locked, amount: locked.balance });
        }
      }

      if (payable.length === 0) {
        return null;
      }

      const total = payable.reduce((sum, row) => sum + row.amount, 0);
      const batch = await manager.getRepository(SettlementBatch).save(
        manager.getRepository(SettlementBatch).create({
          status: SettlementBatchStatus.PENDING,
          currency,
          mode: SettlementBatchMode.NET_PAYABLE,
          splitConfigId: null,
          periodEnd: now,
          totalAmount: total,
          notes: `Netted payouts for ${payable.length} account(s)`,
        }),
      );
      batch.claimedEntryCount = await this.claimEntries(
        manager,
        batch.id,
        payable.map((row) => row.account.id),
        now,
      );

      const payoutRepository = manager.getRepository(SettlementPayout);
      await payoutRepository.save(
        payable.map((row) =>
          payoutRepository.create({
            batchId: batch.id,
            label: row.account.label ?? `${row.account.kind} ${row.account.id}`,
            accountId: row.account.id,
            externalAddress: row.account.externalPayoutAddress,
            basisPoints: null,
            amount: row.amount,
            currency,
            status: SettlementPayoutStatus.PENDING,
            idempotencyKey: `settlement:${batch.id}:account:${row.account.id}`,
            attempts: 0,
          }),
        ),
      );
      await manager.getRepository(SettlementBatch).save(batch);
      return batch;
    });
  }

  /**
   * Advances every payout of a batch by exactly one step: submit what is
   * pending, poll what is submitted, and only then post the ledger
   * drawdown for what the rail confirms. Safe to call repeatedly — that
   * is the whole recovery mechanism for an interrupted run.
   */
  async executeBatch(
    batchId: string,
    now: Date = new Date(),
    summary?: SettlementRunSummary,
  ): Promise<SettlementBatch> {
    const batch = await this.getBatch(batchId);
    if (
      batch.status === SettlementBatchStatus.SETTLED ||
      batch.status === SettlementBatchStatus.ABANDONED
    ) {
      return batch;
    }

    const payouts = await this.payoutRepository.find({
      where: { batchId },
      order: { createdAt: 'ASC' },
    });

    for (const payout of payouts) {
      if (payout.status === SettlementPayoutStatus.PENDING) {
        await this.submitPayout(payout, summary);
        continue;
      }
      if (payout.status === SettlementPayoutStatus.SUBMITTED) {
        await this.pollPayout(payout, now, summary);
      }
    }

    if (summary) {
      summary.batchesExecuted++;
    }
    return this.finalizeBatch(batchId, now, summary);
  }

  /**
   * Puts a batch's failed payouts back in the queue. The idempotency key
   * is deliberately NOT regenerated: handing the rail the same key is
   * what makes a retry safe when the previous attempt's outcome is
   * genuinely unknown — the rail dedupes it if the value already moved.
   */
  async retryBatch(batchId: string): Promise<SettlementBatch> {
    const batch = await this.getBatch(batchId);
    if (batch.status === SettlementBatchStatus.SETTLED) {
      throw new UnprocessableEntityException(
        'This batch is already fully settled',
      );
    }

    await this.payoutRepository.update(
      { batchId, status: SettlementPayoutStatus.FAILED },
      { status: SettlementPayoutStatus.PENDING, lastError: null },
    );
    await this.batchRepository.update(batchId, {
      status: SettlementBatchStatus.IN_PROGRESS,
    });
    return this.executeBatch(batchId);
  }

  /**
   * Admin escape hatch for a payout that will never succeed (a wrong
   * address, a decommissioned account). Releases the claim on the entries
   * this batch never actually settled so a future batch can pick them up
   * again — and posts nothing, because a payout that never happened has
   * no ledger effect to undo: the balance is still shown as owed.
   */
  async abandonBatch(
    batchId: string,
    reason: string,
  ): Promise<SettlementBatch> {
    const batch = await this.getBatch(batchId);
    if (batch.status === SettlementBatchStatus.SETTLED) {
      throw new UnprocessableEntityException(
        'This batch is already fully settled',
      );
    }

    await this.batchRepository.manager.transaction(async (manager) => {
      await manager.getRepository(SettlementPayout).update(
        { batchId, status: In(NON_TERMINAL_PAYOUT_STATUSES) },
        {
          status: SettlementPayoutStatus.FAILED,
          lastError: `Abandoned: ${reason}`,
        },
      );
      await this.releaseClaims(manager, batchId);
      await manager.getRepository(SettlementBatch).update(batchId, {
        status: SettlementBatchStatus.ABANDONED,
        notes: `${batch.notes ?? ''}\nAbandoned: ${reason}`.trim(),
      });
    });

    this.logger.warn(`Settlement batch ${batchId} abandoned: ${reason}`);
    return this.getBatch(batchId);
  }

  async listBatches(
    status?: SettlementBatchStatus,
  ): Promise<SettlementBatch[]> {
    return this.batchRepository.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  /**
   * The full audit view an admin needs (issue #1575's acceptance
   * criterion): which entries went in, which recipients came out, and the
   * on-chain transaction reference for each off-platform leg.
   */
  async getBatchBreakdown(batchId: string): Promise<SettlementBatchBreakdown> {
    const batch = await this.getBatch(batchId);
    const payouts = await this.payoutRepository.find({
      where: { batchId },
      order: { createdAt: 'ASC' },
    });
    const entries = await this.entryRepository.find({
      where: { settlementBatchId: batchId },
      order: { createdAt: 'ASC' },
    });

    return {
      batch,
      payouts,
      entries,
      onChainReferences: payouts
        .filter((payout) => payout.onChainReference)
        .map((payout) => ({
          payoutId: payout.id,
          reference: payout.onChainReference!,
        })),
    };
  }

  async getBatch(batchId: string): Promise<SettlementBatch> {
    const batch = await this.batchRepository.findOne({
      where: { id: batchId },
    });
    if (!batch) {
      throw new NotFoundException(`Settlement batch ${batchId} not found`);
    }
    return batch;
  }

  // ── internals ──────────────────────────────────────────────────────────

  private async submitPayout(
    payout: SettlementPayout,
    summary?: SettlementRunSummary,
  ): Promise<void> {
    if (!payout.externalAddress) {
      // An internal share reaches CONFIRMED at creation; a PENDING payout
      // with no address is a bug, not a payout to guess at.
      this.logger.error(
        `Payout ${payout.id} is PENDING with no external address — skipping`,
      );
      return;
    }
    if (!this.payoutRail) {
      this.note(
        summary,
        `No external payout rail configured (SOROBAN_ENABLED is not true) — ` +
          `payout ${payout.id} stays PENDING`,
      );
      if (summary) {
        summary.payoutsAwaitingRail++;
      }
      return;
    }

    const attempts = payout.attempts + 1;
    try {
      const submission = await this.payoutRail.submitPayout({
        destinationAddress: payout.externalAddress,
        amount: payout.amount,
        currency: payout.currency,
        idempotencyKey: payout.idempotencyKey,
      });
      this.metrics.recordSettlementPayoutAttempt('submitted');
      await this.payoutRepository.update(payout.id, {
        status: SettlementPayoutStatus.SUBMITTED,
        onChainReference: submission.reference,
        attempts,
        lastError: null,
      });
      if (summary) {
        summary.payoutsSubmitted++;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const exhausted = attempts >= this.maxAttempts();
      await this.payoutRepository.update(payout.id, {
        status: exhausted
          ? SettlementPayoutStatus.FAILED
          : SettlementPayoutStatus.PENDING,
        attempts,
        lastError: message,
      });
      if (summary && exhausted) {
        summary.payoutsFailed++;
      }
      this.metrics.recordSettlementPayoutFailure();
      this.logger.error(
        withRequestId(
          `Payout ${payout.id} submission failed (attempt ${attempts}): ${message}`,
        ),
      );
    }
  }

  private async pollPayout(
    payout: SettlementPayout,
    now: Date,
    summary?: SettlementRunSummary,
  ): Promise<void> {
    if (!this.payoutRail || !payout.onChainReference) {
      return;
    }

    let status: 'confirmed' | 'failed' | 'pending';
    try {
      status = await this.payoutRail.getPayoutStatus(payout.onChainReference);
    } catch (error) {
      // Indeterminate: the rail could not be reached. NOT a verdict that
      // the payout failed, so nothing changes — the next pass asks again.
      this.logger.warn(
        withRequestId(
          `Payout ${payout.id} status check failed: ` +
            (error instanceof Error ? error.message : String(error)),
        ),
      );
      return;
    }

    if (status === 'pending') {
      return;
    }
    if (status === 'failed') {
      await this.payoutRepository.update(payout.id, {
        status: SettlementPayoutStatus.FAILED,
        lastError: 'The payout rail reported the transfer as failed',
      });
      if (summary) {
        summary.payoutsFailed++;
      }
      this.metrics.recordSettlementPayoutFailure();
      return;
    }

    await this.confirmPayout(payout, now);
    this.metrics.recordSettlementPayoutAttempt('confirmed');
    if (summary) {
      summary.payoutsConfirmed++;
    }
  }

  /**
   * The only place a payout becomes real in the ledger. Posts the
   * drawdown (debit the payable account, credit TREASURY as the
   * counterparty for value that left the platform) and marks the payout
   * confirmed in the same transaction, so the two can never disagree.
   */
  private async confirmPayout(
    payout: SettlementPayout,
    now: Date,
  ): Promise<void> {
    await this.batchRepository.manager.transaction(async (manager) => {
      const treasury = await this.ledger.getOrCreateAccount(
        {
          kind: LedgerAccountKind.TREASURY,
          ownerId: null,
          currency: payout.currency,
          label: 'treasury',
        },
        manager,
      );

      const { transaction } = await this.ledger.post(
        {
          reference: `settlement:payout:${payout.id}`,
          kind: LedgerTransactionKind.SETTLEMENT,
          currency: payout.currency,
          description:
            `Off-platform payout of ${payout.amount} ${payout.currency} ` +
            `to ${payout.externalAddress}`,
          metadata: {
            batchId: payout.batchId,
            payoutId: payout.id,
            onChainReference: payout.onChainReference,
          },
          legs: [
            {
              accountId: payout.accountId!,
              direction: LedgerEntryDirection.DEBIT,
              amount: payout.amount,
              settlementBatchId: payout.batchId,
              settledAt: now,
            },
            {
              accountId: treasury.id,
              direction: LedgerEntryDirection.CREDIT,
              amount: payout.amount,
              settlementBatchId: payout.batchId,
              settledAt: now,
            },
          ],
        },
        manager,
      );

      await manager.getRepository(SettlementPayout).update(
        // The status guard makes this update the idempotency latch: a
        // second confirmation of the same payout matches no row, and the
        // ledger post above is itself idempotent on its reference.
        { id: payout.id, status: SettlementPayoutStatus.SUBMITTED },
        {
          status: SettlementPayoutStatus.CONFIRMED,
          confirmedAt: now,
          ledgerTransactionId: transaction.id,
          lastError: null,
        },
      );
    });
  }

  /**
   * Recomputes the batch status from its payouts and, only when every
   * payout is CONFIRMED, stamps the claimed entries as settled. Marking
   * them any earlier is exactly the failure mode issue #1575 calls out:
   * the ledger claiming money has moved when the on-chain leg has not.
   */
  private async finalizeBatch(
    batchId: string,
    now: Date,
    summary?: SettlementRunSummary,
  ): Promise<SettlementBatch> {
    const payouts = await this.payoutRepository.find({ where: { batchId } });
    const confirmed = payouts.filter(
      (payout) => payout.status === SettlementPayoutStatus.CONFIRMED,
    ).length;
    const failed = payouts.filter(
      (payout) => payout.status === SettlementPayoutStatus.FAILED,
    ).length;
    const outstanding = payouts.length - confirmed - failed;

    let status: SettlementBatchStatus;
    if (confirmed === payouts.length && payouts.length > 0) {
      status = SettlementBatchStatus.SETTLED;
    } else if (outstanding > 0) {
      status =
        confirmed > 0 || payouts.some((payout) => payout.attempts > 0)
          ? SettlementBatchStatus.IN_PROGRESS
          : SettlementBatchStatus.PENDING;
    } else {
      status =
        confirmed > 0
          ? SettlementBatchStatus.PARTIALLY_SETTLED
          : SettlementBatchStatus.FAILED;
    }

    if (status === SettlementBatchStatus.SETTLED) {
      const settled = await this.entryRepository.update(
        { settlementBatchId: batchId, settledAt: IsNull() },
        { settledAt: now },
      );
      if (summary) {
        summary.entriesSettled += settled.affected ?? 0;
      }
    }

    await this.batchRepository.update(batchId, { status });
    return this.getBatch(batchId);
  }

  /**
   * Marks the accounts' currently-unclaimed entries as belonging to this
   * batch. This is the per-entry audit trail — "these movements were
   * accounted for by batch X" — and the reason a resumed run can show
   * exactly what it already covered.
   */
  private async claimEntries(
    manager: EntityManager,
    batchId: string,
    accountIds: string[],
    periodEnd: Date,
  ): Promise<number> {
    if (accountIds.length === 0) {
      return 0;
    }
    const result = await manager.getRepository(LedgerEntry).update(
      {
        accountId: In(accountIds),
        settlementBatchId: IsNull(),
        createdAt: LessThanOrEqual(periodEnd),
      },
      { settlementBatchId: batchId },
    );
    return result.affected ?? 0;
  }

  private async releaseClaims(
    manager: EntityManager,
    batchId: string,
  ): Promise<void> {
    await manager
      .getRepository(LedgerEntry)
      .update(
        { settlementBatchId: batchId, settledAt: IsNull() },
        { settlementBatchId: null },
      );
  }

  private async hasInFlightPayout(
    manager: EntityManager,
    accountId: string,
  ): Promise<boolean> {
    const count = await manager.getRepository(SettlementPayout).count({
      where: {
        accountId,
        status: In(NON_TERMINAL_PAYOUT_STATUSES),
      },
    });
    return count > 0;
  }

  private async lockAccount(
    manager: EntityManager,
    accountId: string,
  ): Promise<LedgerAccount> {
    const account = await manager
      .getRepository(LedgerAccount)
      .createQueryBuilder('account')
      .setLock('pessimistic_write')
      .where('account.id = :accountId', { accountId })
      .getOne();
    if (!account) {
      throw new NotFoundException(`Ledger account ${accountId} not found`);
    }
    return account;
  }

  private async acquireCreateLock(manager: EntityManager): Promise<void> {
    await manager.query('SELECT pg_advisory_xact_lock($1)', [
      SETTLEMENT_CREATE_LOCK_KEY,
    ]);
  }

  /**
   * Derived from the singleton system accounts (a handful per currency)
   * rather than by scanning every account. Any currency that has ever had
   * movement necessarily has one: every balanced transaction in this
   * module has a system account on one side — a charge credits REVENUE, a
   * top-up debits TREASURY — so nothing can be missed by looking here.
   */
  private async currenciesWithAccounts(): Promise<string[]> {
    const systemAccounts = await this.accountRepository.find({
      where: { ownerId: IsNull() },
    });
    return [...new Set(systemAccounts.map((account) => account.currency))];
  }

  private minPayout(): number {
    return this.config.get<number>('CREDITS_SETTLEMENT_MIN_PAYOUT', 1);
  }

  private maxAttempts(): number {
    return this.config.get<number>('CREDITS_SETTLEMENT_MAX_PAYOUT_ATTEMPTS', 5);
  }

  private note(summary: SettlementRunSummary | undefined, message: string) {
    this.logger.warn(message);
    summary?.notes.push(message);
  }

  private emptySummary(): SettlementRunSummary {
    return {
      batchesCreated: 0,
      batchesExecuted: 0,
      payoutsSubmitted: 0,
      payoutsConfirmed: 0,
      payoutsFailed: 0,
      payoutsAwaitingRail: 0,
      entriesSettled: 0,
      notes: [],
    };
  }
}
