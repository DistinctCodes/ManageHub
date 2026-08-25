import { FindOperator } from 'typeorm';
import { LedgerAccount } from '../entities/ledger-account.entity';
import { LedgerEntry } from '../entities/ledger-entry.entity';
import { LedgerTransaction } from '../entities/ledger-transaction.entity';
import { MeteredUsageEvent } from '../entities/metered-usage-event.entity';
import { PaymentCreditApplication } from '../entities/payment-credit-application.entity';
import { RevenueSplitConfig } from '../entities/revenue-split-config.entity';
import { RevenueSplitRecipient } from '../entities/revenue-split-recipient.entity';
import { SettlementBatch } from '../entities/settlement-batch.entity';
import { SettlementPayout } from '../entities/settlement-payout.entity';
import { LedgerEntryDirection } from '../enums/ledger-entry-direction.enum';

/**
 * Test-only in-memory stand-in for the credit ledger's tables (issue
 * #1575). Not a general TypeORM emulator — just enough of the repository
 * API for these services, with two behaviours that matter for what the
 * specs need to prove:
 *
 *  - **`manager.transaction` serializes.** Callbacks run strictly one
 *    after another, which is exactly the effect the `FOR UPDATE` row locks
 *    have on transactions contending for the same account. That is what
 *    lets a single-threaded jest run demonstrate the overdraft race: the
 *    second charge reads the first one's committed balance.
 *  - **Unique indexes are enforced,** raising a Postgres-shaped
 *    `{ code: '23505', constraint }` error — the real idempotency guard the
 *    services recover from.
 */

// ── where-clause matching ────────────────────────────────────────────────

function toComparable(value: unknown): any {
  return value instanceof Date ? value.getTime() : value;
}

function valueMatches(actual: unknown, expected: unknown): boolean {
  if (expected instanceof FindOperator) {
    switch (expected.type) {
      case 'isNull':
        return actual === null || actual === undefined;
      case 'not':
        // TypeORM's `value` getter unwraps a nested operator, so
        // `Not(IsNull()).value` is `undefined`, not the IsNull operator —
        // `child` is what preserves the nesting.
        return !valueMatches(actual, expected.child ?? expected.value);
      case 'in':
        return (expected.value as unknown[]).some((candidate) =>
          valueMatches(actual, candidate),
        );
      case 'equal':
        return toComparable(actual) === toComparable(expected.value);
      case 'lessThanOrEqual':
        return toComparable(actual) <= toComparable(expected.value);
      case 'lessThan':
        return toComparable(actual) < toComparable(expected.value);
      case 'moreThanOrEqual':
        return toComparable(actual) >= toComparable(expected.value);
      case 'moreThan':
        return toComparable(actual) > toComparable(expected.value);
      default:
        throw new Error(
          `in-memory-ledger: unsupported find operator "${expected.type}"`,
        );
    }
  }
  if (expected === undefined) {
    return true;
  }
  return toComparable(actual) === toComparable(expected);
}

function whereMatches(row: any, where: any): boolean {
  if (!where) {
    return true;
  }
  if (Array.isArray(where)) {
    return where.some((clause) => whereMatches(row, clause));
  }
  return Object.entries(where).every(([key, expected]) =>
    valueMatches(row[key], expected),
  );
}

function applyOrder<T>(rows: T[], order?: Record<string, 'ASC' | 'DESC'>): T[] {
  if (!order) {
    return rows;
  }
  const keys = Object.entries(order);
  return [...rows].sort((a: any, b: any) => {
    for (const [key, direction] of keys) {
      const left = toComparable(a[key]);
      const right = toComparable(b[key]);
      if (left === right) {
        continue;
      }
      const comparison = left > right ? 1 : -1;
      return direction === 'DESC' ? -comparison : comparison;
    }
    return 0;
  });
}

// ── repository fake ──────────────────────────────────────────────────────

export interface UniqueIndexSpec {
  constraint: string;
  keys: string[];
}

export interface FakeRepositoryOptions {
  idPrefix: string;
  unique?: UniqueIndexSpec[];
  /** Populate relations for a `find`/`findOne` that asks for them. */
  hydrate?: (row: any, relations: any) => any;
}

export class FakeRepository<T extends { id?: string }> {
  private sequence = 0;

  constructor(
    readonly rows: any[],
    private readonly options: FakeRepositoryOptions,
  ) {}

  create(data: any = {}): any {
    return Array.isArray(data)
      ? data.map((item) => ({ ...item }))
      : { ...data };
  }

  async save(input: any): Promise<any> {
    if (Array.isArray(input)) {
      const saved = [];
      for (const item of input) {
        saved.push(await this.save(item));
      }
      return saved;
    }
    const row = { ...input };
    if (!row.id) {
      row.id = `${this.options.idPrefix}-${++this.sequence}`;
    }
    row.createdAt = row.createdAt ?? new Date();
    row.updatedAt = new Date();

    this.assertUnique(row);

    const index = this.rows.findIndex((existing) => existing.id === row.id);
    if (index >= 0) {
      this.rows[index] = { ...this.rows[index], ...row };
    } else {
      this.rows.push(row);
    }
    // Mutate the caller's object the way TypeORM does (it assigns the
    // generated id back onto the entity it was handed).
    Object.assign(input, row);
    return { ...row };
  }

  async findOne(options: any = {}): Promise<any | null> {
    const found = applyOrder(
      this.rows.filter((row) => whereMatches(row, options.where)),
      options.order,
    )[0];
    if (!found) {
      return null;
    }
    return this.hydrate({ ...found }, options.relations);
  }

  async find(options: any = {}): Promise<any[]> {
    let found = this.rows.filter((row) => whereMatches(row, options.where));
    found = applyOrder(found, options.order);
    if (options.take) {
      found = found.slice(0, options.take);
    }
    return found.map((row) => this.hydrate({ ...row }, options.relations));
  }

  async count(options: any = {}): Promise<number> {
    return this.rows.filter((row) => whereMatches(row, options.where)).length;
  }

  async update(criteria: any, partial: any): Promise<{ affected: number }> {
    const where =
      typeof criteria === 'string' ? { id: criteria } : (criteria ?? {});
    let affected = 0;
    for (const row of this.rows) {
      if (whereMatches(row, where)) {
        Object.assign(row, partial, { updatedAt: new Date() });
        affected++;
      }
    }
    return { affected };
  }

  async delete(criteria: any): Promise<{ affected: number }> {
    const where =
      typeof criteria === 'string' ? { id: criteria } : (criteria ?? {});
    const keep = this.rows.filter((row) => !whereMatches(row, where));
    const affected = this.rows.length - keep.length;
    this.rows.splice(0, this.rows.length, ...keep);
    return { affected };
  }

  async remove(entity: any): Promise<any> {
    return this.delete({ id: entity.id }).then(() => entity);
  }

  /**
   * Supports only the two chains these services actually build: the
   * `FOR UPDATE` account lock, and a select-with-params read.
   */
  createQueryBuilder(_alias?: string) {
    const params: Record<string, any> = {};
    const builder: any = {
      setLock: () => builder,
      orderBy: () => builder,
      addOrderBy: () => builder,
      where: (_sql: string, args?: Record<string, any>) => {
        Object.assign(params, args ?? {});
        return builder;
      },
      andWhere: (_sql: string, args?: Record<string, any>) => {
        Object.assign(params, args ?? {});
        return builder;
      },
      getOne: async () => {
        const row = this.rows.find((candidate) =>
          params.accountId
            ? candidate.id === params.accountId
            : candidate.id === params.id,
        );
        return row ? { ...row } : null;
      },
      getMany: async () => {
        const ids: string[] = params.ids ?? [];
        return this.rows
          .filter((row) => ids.includes(row.id))
          .sort((a, b) => (a.id > b.id ? 1 : -1))
          .map((row) => ({ ...row }));
      },
    };
    return builder;
  }

  private hydrate(row: any, relations: any): any {
    if (!relations || !this.options.hydrate) {
      return row;
    }
    return this.options.hydrate(row, relations);
  }

  private assertUnique(row: any): void {
    for (const index of this.options.unique ?? []) {
      const clash = this.rows.find(
        (existing) =>
          existing.id !== row.id &&
          index.keys.every(
            (key) => toComparable(existing[key]) === toComparable(row[key]),
          ),
      );
      if (clash) {
        const error: any = new Error(
          `duplicate key value violates unique constraint "${index.constraint}"`,
        );
        error.code = '23505';
        error.constraint = index.constraint;
        throw error;
      }
    }
  }
}

// ── the harness ──────────────────────────────────────────────────────────

export interface LedgerHarness {
  accounts: FakeRepository<LedgerAccount>;
  transactions: FakeRepository<LedgerTransaction>;
  entries: FakeRepository<LedgerEntry>;
  splitConfigs: FakeRepository<RevenueSplitConfig>;
  splitRecipients: FakeRepository<RevenueSplitRecipient>;
  batches: FakeRepository<SettlementBatch>;
  payouts: FakeRepository<SettlementPayout>;
  usageEvents: FakeRepository<MeteredUsageEvent>;
  paymentApplications: FakeRepository<PaymentCreditApplication>;
  /** Number of transaction callbacks that have run — proves serialization. */
  transactionCount: () => number;
  balanceOf: (accountId: string) => number;
  /** Balance re-derived from the append-only entries, for the audit check. */
  derivedBalanceOf: (accountId: string) => number;
}

export function createLedgerHarness(): LedgerHarness {
  const accountRows: any[] = [];
  const transactionRows: any[] = [];
  const entryRows: any[] = [];
  const splitConfigRows: any[] = [];
  const splitRecipientRows: any[] = [];
  const batchRows: any[] = [];
  const payoutRows: any[] = [];
  const usageRows: any[] = [];
  const applicationRows: any[] = [];

  const accounts = new FakeRepository<LedgerAccount>(accountRows, {
    idPrefix: 'account',
    unique: [
      {
        constraint: 'uq_ledger_accounts_owned',
        keys: ['kind', 'ownerId', 'currency'],
      },
    ],
  });
  const transactions = new FakeRepository<LedgerTransaction>(transactionRows, {
    idPrefix: 'transaction',
    unique: [
      {
        constraint: 'uq_ledger_transactions_reference',
        keys: ['reference'],
      },
    ],
  });
  const entries = new FakeRepository<LedgerEntry>(entryRows, {
    idPrefix: 'entry',
  });
  const splitRecipients = new FakeRepository<RevenueSplitRecipient>(
    splitRecipientRows,
    { idPrefix: 'recipient' },
  );
  const splitConfigs = new FakeRepository<RevenueSplitConfig>(splitConfigRows, {
    idPrefix: 'split-config',
    unique: [{ constraint: 'uq_revenue_split_configs_name', keys: ['name'] }],
    hydrate: (row, relations) =>
      relations?.recipients
        ? {
            ...row,
            recipients: splitRecipientRows
              .filter((recipient) => recipient.configId === row.id)
              .map((recipient) => ({ ...recipient })),
          }
        : row,
  });
  const batches = new FakeRepository<SettlementBatch>(batchRows, {
    idPrefix: 'batch',
  });
  const payouts = new FakeRepository<SettlementPayout>(payoutRows, {
    idPrefix: 'payout',
    unique: [
      {
        constraint: 'uq_settlement_payouts_idempotency_key',
        keys: ['idempotencyKey'],
      },
    ],
  });
  const usageEvents = new FakeRepository<MeteredUsageEvent>(usageRows, {
    idPrefix: 'usage',
    unique: [
      {
        constraint: 'uq_metered_usage_events_usage_reference',
        keys: ['usageReference'],
      },
    ],
  });
  const paymentApplications = new FakeRepository<PaymentCreditApplication>(
    applicationRows,
    {
      idPrefix: 'application',
      unique: [
        {
          constraint: 'uq_payment_credit_applications_payment_id',
          keys: ['paymentId'],
        },
      ],
    },
  );

  const byEntity = new Map<unknown, FakeRepository<any>>([
    [LedgerAccount, accounts],
    [LedgerTransaction, transactions],
    [LedgerEntry, entries],
    [RevenueSplitConfig, splitConfigs],
    [RevenueSplitRecipient, splitRecipients],
    [SettlementBatch, batches],
    [SettlementPayout, payouts],
    [MeteredUsageEvent, usageEvents],
    [PaymentCreditApplication, paymentApplications],
  ]);

  let transactionCount = 0;
  let queue: Promise<unknown> = Promise.resolve();

  const manager: any = {
    getRepository: (entity: unknown) => {
      const repository = byEntity.get(entity);
      if (!repository) {
        throw new Error(
          `in-memory-ledger: no fake repository for ${String(entity)}`,
        );
      }
      return repository;
    },
    increment: async (
      _entity: unknown,
      criteria: any,
      property: string,
      value: number,
    ) => {
      for (const row of accountRows) {
        if (whereMatches(row, criteria)) {
          row[property] = (row[property] ?? 0) + value;
        }
      }
      return { affected: 1 };
    },
    // The advisory lock settlement takes before creating a batch.
    query: async () => [],
    // Serializes callbacks, standing in for the row locks that force real
    // concurrent transactions to take turns.
    transaction: async (callback: (m: any) => Promise<unknown>) => {
      const run = queue.then(() => {
        transactionCount++;
        return callback(manager);
      });
      queue = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
  };

  for (const repository of byEntity.values()) {
    (repository as any).manager = manager;
  }

  return {
    accounts,
    transactions,
    entries,
    splitConfigs,
    splitRecipients,
    batches,
    payouts,
    usageEvents,
    paymentApplications,
    transactionCount: () => transactionCount,
    balanceOf: (accountId: string) =>
      accountRows.find((row) => row.id === accountId)?.balance ?? 0,
    derivedBalanceOf: (accountId: string) =>
      entryRows
        .filter((entry) => entry.accountId === accountId)
        .reduce(
          (sum, entry) =>
            entry.direction === LedgerEntryDirection.CREDIT
              ? sum + entry.amount
              : sum - entry.amount,
          0,
        ),
  };
}

/** Minimal ConfigService stand-in: a map with `get(key, default)`. */
export function fakeConfigService(values: Record<string, unknown> = {}) {
  return {
    get: (key: string, fallback?: unknown) =>
      values[key] !== undefined ? values[key] : fallback,
  } as any;
}
