import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { LedgerAccount } from './entities/ledger-account.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { LedgerTransaction } from './entities/ledger-transaction.entity';
import { LedgerAccountKind } from './enums/ledger-account-kind.enum';
import { LedgerEntryDirection } from './enums/ledger-entry-direction.enum';
import { LedgerTransactionKind } from './enums/ledger-transaction-kind.enum';

const POSTGRES_UNIQUE_VIOLATION = '23505';
const LEDGER_TRANSACTION_REFERENCE_CONSTRAINT =
  'uq_ledger_transactions_reference';

/**
 * Raised when a debit would take a member's credit balance past its
 * overdraft ceiling. A ConflictException (409) rather than a 400: the
 * request was well-formed, it lost a race with the account's current
 * state — the same shape the refund ledger uses for its own
 * exceeds-remaining case (issue #1572).
 */
export class InsufficientCreditException extends ConflictException {
  constructor(
    readonly accountId: string,
    readonly balance: number,
    readonly requested: number,
    readonly overdraftLimit: number,
  ) {
    super(
      `Insufficient credit: balance ${balance}, requested ${requested}, ` +
        `overdraft limit ${overdraftLimit}`,
    );
  }
}

export interface LedgerLeg {
  accountId: string;
  direction: LedgerEntryDirection;
  /** Positive minor units — `direction` carries the sign. */
  amount: number;
  /**
   * Stamps this entry as claimed by (and settled within) a settlement
   * batch at write time. Used for the legs that ARE a settlement — the
   * drawdown of a distributed revenue account, the clearing of a paid-out
   * payable — so a later batch can never re-claim them and net the same
   * movement twice. Left unset for ordinary legs, which stay claimable.
   */
  settlementBatchId?: string;
  settledAt?: Date;
}

export interface PostTransactionInput {
  /** Unique natural key — the transaction-level idempotency guard. */
  reference: string;
  kind: LedgerTransactionKind;
  currency: string;
  legs: LedgerLeg[];
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  actorId?: string | null;
}

export interface PostTransactionResult {
  transaction: LedgerTransaction;
  /** False when `reference` had already been posted — nothing was written. */
  posted: boolean;
}

export interface FindAccountInput {
  kind: LedgerAccountKind;
  ownerId?: string | null;
  currency: string;
}

export interface CreateAccountInput extends FindAccountInput {
  overdraftLimit?: number;
  externalPayoutAddress?: string | null;
  label?: string | null;
}

export interface LedgerIntegrityReport {
  accountsChecked: number;
  /** Accounts whose materialized balance disagrees with their entries. */
  balanceDrift: Array<{
    accountId: string;
    materialized: number;
    derived: number;
  }>;
  /** Transactions whose debits and credits do not cancel out. */
  unbalancedTransactions: Array<{
    transactionId: string;
    debits: number;
    credits: number;
  }>;
}

/**
 * The double-entry primitive the whole credits module is built on (issue
 * #1575): balanced sets of append-only entries, plus the row-level
 * locking that makes many small concurrent movements against one account
 * safe.
 *
 * Three invariants everything else relies on:
 *
 *  1. **Every transaction balances.** Debits equal credits, always
 *     validated before anything is written, so the sum of all balances in
 *     a currency stays exactly zero and the ledger can be audited by
 *     addition alone.
 *  2. **`reference` is unique.** A replayed charge, a re-run settlement
 *     pass, a resumed batch job — all collide on it and get the original
 *     transaction back. Callers never have to reason about "did my retry
 *     post twice"; they get `posted: false`.
 *  3. **Accounts are locked in a deterministic order** (ascending id)
 *     before any balance is read or written, so two transactions touching
 *     the same pair of accounts serialize instead of deadlocking, and an
 *     overdraft check can never be made against a stale balance.
 */
@Injectable()
export class LedgerService {
  constructor(
    @InjectRepository(LedgerAccount)
    private readonly accountRepository: Repository<LedgerAccount>,
    @InjectRepository(LedgerTransaction)
    private readonly transactionRepository: Repository<LedgerTransaction>,
    @InjectRepository(LedgerEntry)
    private readonly entryRepository: Repository<LedgerEntry>,
  ) {}

  /**
   * Posts a balanced transaction. Pass `manager` to join a transaction the
   * caller already owns (settlement does this so claiming entries and
   * posting their ledger effect commit together); omit it and one is
   * opened here.
   */
  async post(
    input: PostTransactionInput,
    manager?: EntityManager,
  ): Promise<PostTransactionResult> {
    const normalized = this.validate(input);

    if (manager) {
      return this.postWithin(manager, normalized);
    }
    return this.accountRepository.manager.transaction((tx) =>
      this.postWithin(tx, normalized),
    );
  }

  async getAccount(
    id: string,
    manager?: EntityManager,
  ): Promise<LedgerAccount> {
    const account = await this.accounts(manager).findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException(`Ledger account ${id} not found`);
    }
    return account;
  }

  async findAccount(
    input: FindAccountInput,
    manager?: EntityManager,
  ): Promise<LedgerAccount | null> {
    return this.accounts(manager).findOne({
      where: {
        kind: input.kind,
        ownerId: input.ownerId ?? null,
        currency: input.currency.toUpperCase(),
      },
    });
  }

  /**
   * Idempotent under concurrency: the partial unique indexes on
   * (kind, owner_id, currency) — one for owned accounts, one for the
   * singleton system accounts — are the actual source of truth, and the
   * loser of a race recovers by re-reading rather than erroring.
   */
  async getOrCreateAccount(
    input: CreateAccountInput,
    manager?: EntityManager,
  ): Promise<LedgerAccount> {
    const currency = input.currency.toUpperCase();
    const existing = await this.findAccount({ ...input, currency }, manager);
    if (existing) {
      return existing;
    }

    const repository = this.accounts(manager);
    try {
      return await repository.save(
        repository.create({
          kind: input.kind,
          ownerId: input.ownerId ?? null,
          currency,
          balance: 0,
          overdraftLimit: input.overdraftLimit ?? 0,
          externalPayoutAddress: input.externalPayoutAddress ?? null,
          frozen: false,
          label: input.label ?? null,
        }),
      );
    } catch (error) {
      if (!this.isUniqueViolation(error)) {
        throw error;
      }
      const winner = await this.findAccount({ ...input, currency }, manager);
      if (!winner) {
        throw error;
      }
      return winner;
    }
  }

  async listAccounts(currency?: string): Promise<LedgerAccount[]> {
    return this.accountRepository.find({
      where: currency ? { currency: currency.toUpperCase() } : {},
      order: { kind: 'ASC', createdAt: 'ASC' },
    });
  }

  /**
   * The only sanctioned way to change an account's policy fields. Balance
   * is deliberately not among them: it moves only by posting entries, so
   * there is no code path that can set a balance without an audit trail.
   */
  async updateAccountPolicy(
    accountId: string,
    changes: {
      overdraftLimit?: number;
      externalPayoutAddress?: string | null;
      frozen?: boolean;
      label?: string | null;
    },
  ): Promise<LedgerAccount> {
    const account = await this.getAccount(accountId);
    if (changes.overdraftLimit !== undefined) {
      if (
        !Number.isInteger(changes.overdraftLimit) ||
        changes.overdraftLimit < 0
      ) {
        throw new BadRequestException(
          'An overdraft limit must be a non-negative integer (minor units)',
        );
      }
      account.overdraftLimit = changes.overdraftLimit;
    }
    if (changes.externalPayoutAddress !== undefined) {
      account.externalPayoutAddress = changes.externalPayoutAddress;
    }
    if (changes.frozen !== undefined) {
      account.frozen = changes.frozen;
    }
    if (changes.label !== undefined) {
      account.label = changes.label;
    }
    return this.accountRepository.save(account);
  }

  /**
   * Re-derives every account's balance from its append-only entries and
   * reports any disagreement with the materialized column, plus any
   * transaction whose legs do not cancel out. The entries are the source
   * of truth; the column is a cache that exists so an overdraft check can
   * be O(1) — this is what proves the cache is honest.
   */
  async checkIntegrity(currency?: string): Promise<LedgerIntegrityReport> {
    const accounts = await this.accountRepository.find({
      where: currency ? { currency: currency.toUpperCase() } : {},
    });

    const derivedRows = await this.entryRepository
      .createQueryBuilder('entry')
      .select('entry.account_id', 'accountId')
      .addSelect(
        `COALESCE(SUM(CASE WHEN entry.direction = 'CREDIT' ` +
          `THEN entry.amount ELSE -entry.amount END), 0)`,
        'derived',
      )
      .groupBy('entry.account_id')
      .getRawMany<{ accountId: string; derived: string }>();
    const derivedByAccount = new Map(
      derivedRows.map((row) => [row.accountId, Number(row.derived)]),
    );

    const balanceDrift = accounts
      .map((account) => ({
        accountId: account.id,
        materialized: account.balance,
        derived: derivedByAccount.get(account.id) ?? 0,
      }))
      .filter((row) => row.materialized !== row.derived);

    const unbalancedRows = await this.entryRepository
      .createQueryBuilder('entry')
      .select('entry.transaction_id', 'transactionId')
      .addSelect(
        `COALESCE(SUM(CASE WHEN entry.direction = 'DEBIT' ` +
          `THEN entry.amount ELSE 0 END), 0)`,
        'debits',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN entry.direction = 'CREDIT' ` +
          `THEN entry.amount ELSE 0 END), 0)`,
        'credits',
      )
      .groupBy('entry.transaction_id')
      .having(
        `SUM(CASE WHEN entry.direction = 'DEBIT' THEN entry.amount ELSE 0 END) ` +
          `<> SUM(CASE WHEN entry.direction = 'CREDIT' THEN entry.amount ELSE 0 END)`,
      )
      .getRawMany<{ transactionId: string; debits: string; credits: string }>();

    return {
      accountsChecked: accounts.length,
      balanceDrift,
      unbalancedTransactions: unbalancedRows.map((row) => ({
        transactionId: row.transactionId,
        debits: Number(row.debits),
        credits: Number(row.credits),
      })),
    };
  }

  async getTransactionByReference(
    reference: string,
    manager?: EntityManager,
  ): Promise<LedgerTransaction | null> {
    return this.transactions(manager).findOne({ where: { reference } });
  }

  async listEntries(accountId: string, limit = 100): Promise<LedgerEntry[]> {
    return this.entryRepository.find({
      where: { accountId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async listEntriesForTransactions(
    transactionIds: string[],
  ): Promise<LedgerEntry[]> {
    if (transactionIds.length === 0) {
      return [];
    }
    return this.entryRepository.find({
      where: { transactionId: In(transactionIds) },
    });
  }

  // ── internals ──────────────────────────────────────────────────────────

  private async postWithin(
    manager: EntityManager,
    input: PostTransactionInput,
  ): Promise<PostTransactionResult> {
    const existing = await this.getTransactionByReference(
      input.reference,
      manager,
    );
    if (existing) {
      return { transaction: existing, posted: false };
    }

    const accounts = await this.lockAccounts(
      manager,
      input.legs.map((leg) => leg.accountId),
    );
    this.assertLegsPostable(input, accounts);

    let transaction: LedgerTransaction;
    try {
      transaction = await manager.getRepository(LedgerTransaction).save(
        manager.getRepository(LedgerTransaction).create({
          kind: input.kind,
          reference: input.reference,
          currency: input.currency,
          amount: this.sideTotal(input.legs, LedgerEntryDirection.DEBIT),
          description: input.description ?? null,
          metadata: input.metadata ?? null,
          actorId: input.actorId ?? null,
        }),
      );
    } catch (error) {
      // Two callers raced on the same reference; the unique index is the
      // arbiter and the loser reports the winner's transaction.
      if (
        this.isUniqueViolation(error) &&
        this.violatedConstraint(error) ===
          LEDGER_TRANSACTION_REFERENCE_CONSTRAINT
      ) {
        const winner = await this.getTransactionByReference(
          input.reference,
          manager,
        );
        if (winner) {
          return { transaction: winner, posted: false };
        }
      }
      throw error;
    }

    const entryRepository = manager.getRepository(LedgerEntry);
    await entryRepository.save(
      input.legs.map((leg) =>
        entryRepository.create({
          transactionId: transaction.id,
          accountId: leg.accountId,
          direction: leg.direction,
          amount: leg.amount,
          currency: input.currency,
          settlementBatchId: leg.settlementBatchId ?? null,
          settledAt: leg.settledAt ?? null,
        }),
      ),
    );

    for (const [accountId, delta] of this.netByAccount(input.legs)) {
      // Relative arithmetic in SQL (`balance = balance + delta`) rather
      // than writing back a value read in JS. The lock above already
      // serializes us, so both are correct here — but a relative update
      // stays correct even if a future caller reaches this without the
      // lock, which a read-modify-write would not.
      await manager.increment(
        LedgerAccount,
        { id: accountId },
        'balance',
        delta,
      );
    }

    return { transaction, posted: true };
  }

  /**
   * Locks every account the transaction touches, in ascending id order.
   * The ordering is the deadlock guard: two transactions that touch the
   * same accounts in opposite order would otherwise each hold one lock and
   * wait on the other forever.
   */
  private async lockAccounts(
    manager: EntityManager,
    accountIds: string[],
  ): Promise<Map<string, LedgerAccount>> {
    const unique = [...new Set(accountIds)].sort();
    const accounts = await manager
      .getRepository(LedgerAccount)
      .createQueryBuilder('account')
      .setLock('pessimistic_write')
      .where('account.id IN (:...ids)', { ids: unique })
      .orderBy('account.id', 'ASC')
      .getMany();

    if (accounts.length !== unique.length) {
      const found = new Set(accounts.map((account) => account.id));
      const missing = unique.filter((id) => !found.has(id));
      throw new NotFoundException(
        `Ledger account(s) not found: ${missing.join(', ')}`,
      );
    }
    return new Map(accounts.map((account) => [account.id, account]));
  }

  /**
   * The overdraft and freeze policy, applied against balances just read
   * under lock.
   *
   * It is enforced for USER accounts only, and that is a deliberate line:
   * a member's credit balance is real spendable value, so a debit past
   * `overdraftLimit` (0 by default — reject the moment it would overdraw)
   * is refused. System accounts are the other side of movements that have
   * already happened — TREASURY in particular is the clearing account for
   * value that crossed the platform boundary and is *expected* to sit
   * deeply negative — so constraining them would only make correct
   * bookkeeping impossible.
   */
  private assertLegsPostable(
    input: PostTransactionInput,
    accounts: Map<string, LedgerAccount>,
  ): void {
    for (const [accountId, delta] of this.netByAccount(input.legs)) {
      const account = accounts.get(accountId)!;
      if (account.currency !== input.currency) {
        throw new BadRequestException(
          `Ledger account ${accountId} is in ${account.currency}, ` +
            `but the transaction is in ${input.currency}`,
        );
      }
      if (delta >= 0 || account.kind !== LedgerAccountKind.USER) {
        continue;
      }
      if (account.frozen) {
        throw new ConflictException(
          `Ledger account ${accountId} is frozen and cannot be debited`,
        );
      }
      const resulting = account.balance + delta;
      if (resulting < -account.overdraftLimit) {
        throw new InsufficientCreditException(
          accountId,
          account.balance,
          -delta,
          account.overdraftLimit,
        );
      }
    }
  }

  private validate(input: PostTransactionInput): PostTransactionInput {
    if (!input.reference?.trim()) {
      throw new BadRequestException(
        'A ledger transaction reference is required',
      );
    }
    if (input.legs.length < 2) {
      throw new BadRequestException(
        'A ledger transaction needs at least one debit and one credit leg',
      );
    }
    for (const leg of input.legs) {
      if (!Number.isInteger(leg.amount) || leg.amount <= 0) {
        throw new BadRequestException(
          'Ledger leg amounts must be positive integers (minor units), ' +
            `got ${leg.amount}`,
        );
      }
    }

    const debits = this.sideTotal(input.legs, LedgerEntryDirection.DEBIT);
    const credits = this.sideTotal(input.legs, LedgerEntryDirection.CREDIT);
    if (debits !== credits) {
      throw new BadRequestException(
        `Ledger transaction does not balance: debits ${debits}, credits ${credits}`,
      );
    }
    if (debits === 0) {
      throw new BadRequestException(
        'A ledger transaction must move a non-zero amount',
      );
    }

    const currency = input.currency?.toUpperCase();
    if (!currency || currency.length !== 3) {
      throw new BadRequestException(
        `Ledger transaction currency must be a 3-letter code, got ${input.currency}`,
      );
    }

    return { ...input, currency, reference: input.reference.trim() };
  }

  private sideTotal(
    legs: readonly LedgerLeg[],
    direction: LedgerEntryDirection,
  ): number {
    return legs
      .filter((leg) => leg.direction === direction)
      .reduce((sum, leg) => sum + leg.amount, 0);
  }

  /** Net balance delta per account (credits positive, debits negative). */
  private netByAccount(legs: readonly LedgerLeg[]): Map<string, number> {
    const net = new Map<string, number>();
    for (const leg of legs) {
      const signed =
        leg.direction === LedgerEntryDirection.CREDIT
          ? leg.amount
          : -leg.amount;
      net.set(leg.accountId, (net.get(leg.accountId) ?? 0) + signed);
    }
    return net;
  }

  private accounts(manager?: EntityManager): Repository<LedgerAccount> {
    return manager
      ? manager.getRepository(LedgerAccount)
      : this.accountRepository;
  }

  private transactions(manager?: EntityManager): Repository<LedgerTransaction> {
    return manager
      ? manager.getRepository(LedgerTransaction)
      : this.transactionRepository;
  }

  private isUniqueViolation(error: unknown): boolean {
    const code = (error as any)?.code ?? (error as any)?.driverError?.code;
    return code === POSTGRES_UNIQUE_VIOLATION;
  }

  private violatedConstraint(error: unknown): string | undefined {
    return (
      (error as any)?.constraint ?? (error as any)?.driverError?.constraint
    );
  }
}
