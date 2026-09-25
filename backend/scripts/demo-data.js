/**
 * Deterministic local-development data for exercising the ManageHub API by
 * hand. The seed contains three ACTIVE wallets (CUSTODIAL and EXTERNAL),
 * their CREDIT/DEBIT wallet-ledger entries, five FIAT payments spanning the
 * operational statuses, four balanced credit-ledger transactions, and two
 * metered usage events that point at those transactions.
 *
 * Commands:
 *   - `seed` inserts the fixed rows and is safe to run repeatedly.
 *   - `clear` deletes only rows carrying the fixed demo identifiers, after
 *     refusing to remove any row that has acquired a non-demo dependent.
 *   - `info` reports total and demo row counts without writing anything.
 *   - `validate` checks ledger, wallet, payment, and usage invariants and
 *     exits non-zero when an assertion fails.
 *
 * The identifiers below are deliberately fixed UUIDs so a second invocation
 * cannot create a second copy of the demo dataset. Amounts, statuses, and
 * references are fixed; timestamps are relative to the invocation so the
 * initiated/awaiting TTL examples remain useful. The credit currency follows
 * CREDITS_DEFAULT_CURRENCY (falling back to USD). User/owner identifiers are
 * plain UUID columns in this backend; this script does not create or
 * require a users-table row:
 *
 *   user IDs:    11111111-1111-4111-8111-111111111111
 *                22222222-2222-4222-8222-222222222222
 *                33333333-3333-4333-8333-333333333333
 *   actor ID:    99999999-9999-4999-8999-999999999999
 *   wallets:     aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa
 *                bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb
 *                cccccccc-cccc-4ccc-8ccc-cccccccccccc
 *   wallet entries: b1000000-0000-4000-8000-000000000001..006
 *   payments:    d0000000-0000-4000-8000-000000000001..005
 *                (bookings use b0000000-0000-4000-8000-000000000001..005)
 *   ledger:      accounts e0000000-0000-4000-8000-000000000001..004,
 *                transactions f0000000-0000-4000-8000-000000000001..004,
 *                entries a1000000-0000-4000-8000-000000000001..008,
 *                usage events c1000000-0000-4000-8000-000000000001..002
 *
 * Safety: the script connects only to localhost, 127.0.0.0/8, ::1, or
 * host.docker.internal by default. For any other DATABASE_HOST it refuses
 * every command, including read-only commands, unless the operator passes
 * `--allow-remote` or sets DEMO_SEED_ALLOW_REMOTE=1. This is especially
 * important for `clear`, which is a targeted delete rather than a table-wide
 * delete.
 */
const { Client } = require('pg');

const DEMO_MARKER = 'managehub-demo-data-v1';
const DEFAULT_CURRENCY = (
  process.env.CREDITS_DEFAULT_CURRENCY || 'USD'
).toUpperCase();
const WALLET_CURRENCY = 'XLM';
const LOCAL_HOSTS = new Set(['localhost', '::1', '[::1]', 'host.docker.internal']);
const COMMANDS = new Set(['seed', 'clear', 'info', 'validate']);

const DEMO = Object.freeze({
  users: Object.freeze({
    alice: '11111111-1111-4111-8111-111111111111',
    bob: '22222222-2222-4222-8222-222222222222',
    carol: '33333333-3333-4333-8333-333333333333',
    admin: '99999999-9999-4999-8999-999999999999',
  }),
  wallets: Object.freeze({
    alice: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    bob: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    carol: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  }),
  bookings: Object.freeze({
    initiated: 'b0000000-0000-4000-8000-000000000001',
    awaiting: 'b0000000-0000-4000-8000-000000000002',
    confirmed: 'b0000000-0000-4000-8000-000000000003',
    failed: 'b0000000-0000-4000-8000-000000000004',
    manualReview: 'b0000000-0000-4000-8000-000000000005',
  }),
  walletLedgerEntries: Object.freeze({
    aliceCredit: 'b1000000-0000-4000-8000-000000000001',
    aliceDebit: 'b1000000-0000-4000-8000-000000000002',
    bobCredit: 'b1000000-0000-4000-8000-000000000003',
    bobDebit: 'b1000000-0000-4000-8000-000000000004',
    carolCredit: 'b1000000-0000-4000-8000-000000000005',
    carolDebit: 'b1000000-0000-4000-8000-000000000006',
  }),
  payments: Object.freeze({
    initiated: 'd0000000-0000-4000-8000-000000000001',
    awaiting: 'd0000000-0000-4000-8000-000000000002',
    confirmed: 'd0000000-0000-4000-8000-000000000003',
    failed: 'd0000000-0000-4000-8000-000000000004',
    manualReview: 'd0000000-0000-4000-8000-000000000005',
  }),
  ledgerAccounts: Object.freeze({
    treasury: 'e0000000-0000-4000-8000-000000000001',
    revenue: 'e0000000-0000-4000-8000-000000000002',
    alice: 'e0000000-0000-4000-8000-000000000003',
    bob: 'e0000000-0000-4000-8000-000000000004',
  }),
  ledgerTransactions: Object.freeze({
    aliceTopUp: 'f0000000-0000-4000-8000-000000000001',
    aliceCharge: 'f0000000-0000-4000-8000-000000000002',
    bobTopUp: 'f0000000-0000-4000-8000-000000000003',
    bobCharge: 'f0000000-0000-4000-8000-000000000004',
  }),
  ledgerEntries: Object.freeze({
    aliceTopUpTreasury: 'a1000000-0000-4000-8000-000000000001',
    aliceTopUpUser: 'a1000000-0000-4000-8000-000000000002',
    aliceChargeUser: 'a1000000-0000-4000-8000-000000000003',
    aliceChargeRevenue: 'a1000000-0000-4000-8000-000000000004',
    bobTopUpTreasury: 'a1000000-0000-4000-8000-000000000005',
    bobTopUpUser: 'a1000000-0000-4000-8000-000000000006',
    bobChargeUser: 'a1000000-0000-4000-8000-000000000007',
    bobChargeRevenue: 'a1000000-0000-4000-8000-000000000008',
  }),
  usageEvents: Object.freeze({
    alicePrinting: 'c1000000-0000-4000-8000-000000000001',
    bobOverage: 'c1000000-0000-4000-8000-000000000002',
  }),
});

const DEMO_TABLES = Object.freeze([
  { table: 'wallet_accounts', ids: Object.values(DEMO.wallets) },
  { table: 'wallet_ledger_entries', ids: Object.values(DEMO.walletLedgerEntries) },
  { table: 'payments', ids: Object.values(DEMO.payments) },
  { table: 'ledger_accounts', ids: Object.values(DEMO.ledgerAccounts) },
  { table: 'ledger_transactions', ids: Object.values(DEMO.ledgerTransactions) },
  { table: 'ledger_entries', ids: Object.values(DEMO.ledgerEntries) },
  { table: 'metered_usage_events', ids: Object.values(DEMO.usageEvents) },
]);

function quoteIdentifier(identifier) {
  if (!/^[a-z_]+$/.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

function minutesFrom(base, minutes) {
  return new Date(base + minutes * 60_000);
}

function demoJson(scenario) {
  return JSON.stringify({ demo: DEMO_MARKER, scenario });
}

async function insertMany(client, table, columns, rows) {
  if (rows.length === 0) {
    return;
  }

  const values = [];
  const tuples = rows.map((row) => {
    const placeholders = columns.map((column) => {
      if (!Object.prototype.hasOwnProperty.call(row, column)) {
        throw new Error(`Missing ${table}.${column} in demo seed row`);
      }
      values.push(row[column] === undefined ? null : row[column]);
      return `$${values.length}`;
    });
    return `(${placeholders.join(', ')})`;
  });

  const columnSql = columns.map(quoteIdentifier).join(', ');
  await client.query(
    `INSERT INTO ${quoteIdentifier(table)} (${columnSql}) ` +
      `VALUES ${tuples.join(', ')} ON CONFLICT DO NOTHING`,
    values,
  );
}

function buildRows(base) {
  const walletAccounts = [
    {
      id: DEMO.wallets.alice,
      user_id: DEMO.users.alice,
      address: 'GDEMO_CUSTODIAL_ALICE',
      custody_type: 'CUSTODIAL',
      status: 'ACTIVE',
      created_at: minutesFrom(base, -1440),
      updated_at: minutesFrom(base, -1440),
    },
    {
      id: DEMO.wallets.bob,
      user_id: DEMO.users.bob,
      address: 'GDEMO_EXTERNAL_BOB',
      custody_type: 'EXTERNAL',
      status: 'ACTIVE',
      created_at: minutesFrom(base, -1440),
      updated_at: minutesFrom(base, -1440),
    },
    {
      id: DEMO.wallets.carol,
      user_id: DEMO.users.carol,
      address: 'GDEMO_CUSTODIAL_CAROL',
      custody_type: 'CUSTODIAL',
      status: 'ACTIVE',
      created_at: minutesFrom(base, -1440),
      updated_at: minutesFrom(base, -1440),
    },
  ];

  const walletLedgerEntries = [
    {
      id: DEMO.walletLedgerEntries.aliceCredit,
      wallet_account_id: DEMO.wallets.alice,
      type: 'CREDIT',
      amount: 2000000,
      currency: WALLET_CURRENCY,
      reason: `${DEMO_MARKER}: alice opening credit`,
      actor_id: DEMO.users.admin,
      created_at: minutesFrom(base, -1440),
    },
    {
      id: DEMO.walletLedgerEntries.aliceDebit,
      wallet_account_id: DEMO.wallets.alice,
      type: 'DEBIT',
      amount: 500000,
      currency: WALLET_CURRENCY,
      reason: `${DEMO_MARKER}: alice demo debit`,
      actor_id: DEMO.users.admin,
      created_at: minutesFrom(base, -1380),
    },
    {
      id: DEMO.walletLedgerEntries.bobCredit,
      wallet_account_id: DEMO.wallets.bob,
      type: 'CREDIT',
      amount: 1250000,
      currency: WALLET_CURRENCY,
      reason: `${DEMO_MARKER}: bob opening credit`,
      actor_id: DEMO.users.admin,
      created_at: minutesFrom(base, -1440),
    },
    {
      id: DEMO.walletLedgerEntries.bobDebit,
      wallet_account_id: DEMO.wallets.bob,
      type: 'DEBIT',
      amount: 250000,
      currency: WALLET_CURRENCY,
      reason: `${DEMO_MARKER}: bob demo debit`,
      actor_id: DEMO.users.admin,
      created_at: minutesFrom(base, -1320),
    },
    {
      id: DEMO.walletLedgerEntries.carolCredit,
      wallet_account_id: DEMO.wallets.carol,
      type: 'CREDIT',
      amount: 750000,
      currency: WALLET_CURRENCY,
      reason: `${DEMO_MARKER}: carol opening credit`,
      actor_id: DEMO.users.admin,
      created_at: minutesFrom(base, -1440),
    },
    {
      id: DEMO.walletLedgerEntries.carolDebit,
      wallet_account_id: DEMO.wallets.carol,
      type: 'DEBIT',
      amount: 100000,
      currency: WALLET_CURRENCY,
      reason: `${DEMO_MARKER}: carol demo debit`,
      actor_id: DEMO.users.admin,
      created_at: minutesFrom(base, -1260),
    },
  ];

  const payments = [
    {
      id: DEMO.payments.initiated,
      booking_id: DEMO.bookings.initiated,
      user_id: DEMO.users.alice,
      amount: 2500,
      currency: DEFAULT_CURRENCY,
      rail: 'FIAT',
      provider: 'demo-fiat',
      provider_reference: null,
      status: 'INITIATED',
      idempotency_key: 'demo-payment-initiated',
      metadata: demoJson('payment-initiated'),
      expires_at: minutesFrom(base, 25),
      failure_reason: null,
      reconciliation_attempts: 0,
      provider_error_streak: 0,
      last_reconciled_at: null,
      manual_review_reason: null,
      created_at: minutesFrom(base, -5),
      updated_at: minutesFrom(base, -5),
    },
    {
      id: DEMO.payments.awaiting,
      booking_id: DEMO.bookings.awaiting,
      user_id: DEMO.users.bob,
      amount: 4500,
      currency: DEFAULT_CURRENCY,
      rail: 'FIAT',
      provider: 'demo-fiat',
      provider_reference: 'demo-provider-ref-awaiting',
      status: 'AWAITING_CONFIRMATION',
      idempotency_key: 'demo-payment-awaiting',
      metadata: demoJson('payment-awaiting'),
      expires_at: minutesFrom(base, 10),
      failure_reason: null,
      reconciliation_attempts: 2,
      provider_error_streak: 0,
      last_reconciled_at: minutesFrom(base, -10),
      manual_review_reason: null,
      created_at: minutesFrom(base, -20),
      updated_at: minutesFrom(base, -10),
    },
    {
      id: DEMO.payments.confirmed,
      booking_id: DEMO.bookings.confirmed,
      user_id: DEMO.users.carol,
      amount: 7800,
      currency: DEFAULT_CURRENCY,
      rail: 'FIAT',
      provider: 'demo-fiat',
      provider_reference: 'demo-provider-ref-confirmed',
      status: 'CONFIRMED',
      idempotency_key: 'demo-payment-confirmed',
      metadata: demoJson('payment-confirmed'),
      expires_at: minutesFrom(base, -90),
      failure_reason: null,
      reconciliation_attempts: 3,
      provider_error_streak: 0,
      last_reconciled_at: minutesFrom(base, -120),
      manual_review_reason: null,
      created_at: minutesFrom(base, -120),
      updated_at: minutesFrom(base, -120),
    },
    {
      id: DEMO.payments.failed,
      booking_id: DEMO.bookings.failed,
      user_id: DEMO.users.alice,
      amount: 1250,
      currency: DEFAULT_CURRENCY,
      rail: 'FIAT',
      provider: 'demo-fiat',
      provider_reference: 'demo-provider-ref-failed',
      status: 'FAILED',
      idempotency_key: 'demo-payment-failed',
      metadata: demoJson('payment-failed'),
      expires_at: minutesFrom(base, -1410),
      failure_reason: 'DECLINED',
      reconciliation_attempts: 4,
      provider_error_streak: 1,
      last_reconciled_at: minutesFrom(base, -60),
      manual_review_reason: null,
      created_at: minutesFrom(base, -1440),
      updated_at: minutesFrom(base, -60),
    },
    {
      id: DEMO.payments.manualReview,
      booking_id: DEMO.bookings.manualReview,
      user_id: DEMO.users.bob,
      amount: 9900,
      currency: DEFAULT_CURRENCY,
      rail: 'FIAT',
      provider: 'demo-fiat',
      provider_reference: 'demo-provider-ref-manual-review',
      status: 'MANUAL_REVIEW',
      idempotency_key: 'demo-payment-manual-review',
      metadata: demoJson('payment-manual-review'),
      expires_at: minutesFrom(base, -2130),
      failure_reason: null,
      reconciliation_attempts: 9,
      provider_error_streak: 2,
      last_reconciled_at: minutesFrom(base, -120),
      manual_review_reason: 'Provider returned an indeterminate result after repeated checks',
      created_at: minutesFrom(base, -2160),
      updated_at: minutesFrom(base, -120),
    },
  ];

  const ledgerAccounts = [
    {
      id: DEMO.ledgerAccounts.treasury,
      kind: 'TREASURY',
      owner_id: null,
      currency: DEFAULT_CURRENCY,
      balance: -15000,
      overdraft_limit: 0,
      external_payout_address: null,
      frozen: false,
      label: `${DEMO_MARKER}: treasury`,
      created_at: minutesFrom(base, -2880),
      updated_at: minutesFrom(base, -1440),
    },
    {
      id: DEMO.ledgerAccounts.revenue,
      kind: 'REVENUE',
      owner_id: null,
      currency: DEFAULT_CURRENCY,
      balance: 3750,
      overdraft_limit: 0,
      external_payout_address: null,
      frozen: false,
      label: `${DEMO_MARKER}: revenue`,
      created_at: minutesFrom(base, -2880),
      updated_at: minutesFrom(base, -120),
    },
    {
      id: DEMO.ledgerAccounts.alice,
      kind: 'USER',
      owner_id: DEMO.users.alice,
      currency: DEFAULT_CURRENCY,
      balance: 7500,
      overdraft_limit: 0,
      external_payout_address: null,
      frozen: false,
      label: `${DEMO_MARKER}: alice user credit`,
      created_at: minutesFrom(base, -2880),
      updated_at: minutesFrom(base, -120),
    },
    {
      id: DEMO.ledgerAccounts.bob,
      kind: 'USER',
      owner_id: DEMO.users.bob,
      currency: DEFAULT_CURRENCY,
      balance: 3750,
      overdraft_limit: 0,
      external_payout_address: null,
      frozen: false,
      label: `${DEMO_MARKER}: bob user credit`,
      created_at: minutesFrom(base, -2880),
      updated_at: minutesFrom(base, -120),
    },
  ];

  const ledgerTransactions = [
    {
      id: DEMO.ledgerTransactions.aliceTopUp,
      kind: 'TOP_UP',
      reference: 'demo:top-up:alice',
      currency: DEFAULT_CURRENCY,
      amount: 10000,
      description: 'Demo credit top-up for Alice',
      metadata: demoJson('top-up-alice'),
      actor_id: null,
      created_at: minutesFrom(base, -2880),
    },
    {
      id: DEMO.ledgerTransactions.aliceCharge,
      kind: 'CHARGE',
      reference: 'demo:charge:usage:alice-printing',
      currency: DEFAULT_CURRENCY,
      amount: 2500,
      description: 'Demo printing charge for Alice',
      metadata: demoJson('charge-alice'),
      actor_id: DEMO.users.admin,
      created_at: minutesFrom(base, -120),
    },
    {
      id: DEMO.ledgerTransactions.bobTopUp,
      kind: 'TOP_UP',
      reference: 'demo:top-up:bob',
      currency: DEFAULT_CURRENCY,
      amount: 5000,
      description: 'Demo credit top-up for Bob',
      metadata: demoJson('top-up-bob'),
      actor_id: null,
      created_at: minutesFrom(base, -2400),
    },
    {
      id: DEMO.ledgerTransactions.bobCharge,
      kind: 'CHARGE',
      reference: 'demo:charge:usage:bob-overage',
      currency: DEFAULT_CURRENCY,
      amount: 1250,
      description: 'Demo meeting-room overage charge for Bob',
      metadata: demoJson('charge-bob'),
      actor_id: DEMO.users.admin,
      created_at: minutesFrom(base, -120),
    },
  ];

  const ledgerEntries = [
    {
      id: DEMO.ledgerEntries.aliceTopUpTreasury,
      transaction_id: DEMO.ledgerTransactions.aliceTopUp,
      account_id: DEMO.ledgerAccounts.treasury,
      direction: 'DEBIT',
      amount: 10000,
      currency: DEFAULT_CURRENCY,
      settlement_batch_id: null,
      settled_at: null,
      created_at: minutesFrom(base, -2880),
    },
    {
      id: DEMO.ledgerEntries.aliceTopUpUser,
      transaction_id: DEMO.ledgerTransactions.aliceTopUp,
      account_id: DEMO.ledgerAccounts.alice,
      direction: 'CREDIT',
      amount: 10000,
      currency: DEFAULT_CURRENCY,
      settlement_batch_id: null,
      settled_at: null,
      created_at: minutesFrom(base, -2880),
    },
    {
      id: DEMO.ledgerEntries.aliceChargeUser,
      transaction_id: DEMO.ledgerTransactions.aliceCharge,
      account_id: DEMO.ledgerAccounts.alice,
      direction: 'DEBIT',
      amount: 2500,
      currency: DEFAULT_CURRENCY,
      settlement_batch_id: null,
      settled_at: null,
      created_at: minutesFrom(base, -120),
    },
    {
      id: DEMO.ledgerEntries.aliceChargeRevenue,
      transaction_id: DEMO.ledgerTransactions.aliceCharge,
      account_id: DEMO.ledgerAccounts.revenue,
      direction: 'CREDIT',
      amount: 2500,
      currency: DEFAULT_CURRENCY,
      settlement_batch_id: null,
      settled_at: null,
      created_at: minutesFrom(base, -120),
    },
    {
      id: DEMO.ledgerEntries.bobTopUpTreasury,
      transaction_id: DEMO.ledgerTransactions.bobTopUp,
      account_id: DEMO.ledgerAccounts.treasury,
      direction: 'DEBIT',
      amount: 5000,
      currency: DEFAULT_CURRENCY,
      settlement_batch_id: null,
      settled_at: null,
      created_at: minutesFrom(base, -2400),
    },
    {
      id: DEMO.ledgerEntries.bobTopUpUser,
      transaction_id: DEMO.ledgerTransactions.bobTopUp,
      account_id: DEMO.ledgerAccounts.bob,
      direction: 'CREDIT',
      amount: 5000,
      currency: DEFAULT_CURRENCY,
      settlement_batch_id: null,
      settled_at: null,
      created_at: minutesFrom(base, -2400),
    },
    {
      id: DEMO.ledgerEntries.bobChargeUser,
      transaction_id: DEMO.ledgerTransactions.bobCharge,
      account_id: DEMO.ledgerAccounts.bob,
      direction: 'DEBIT',
      amount: 1250,
      currency: DEFAULT_CURRENCY,
      settlement_batch_id: null,
      settled_at: null,
      created_at: minutesFrom(base, -120),
    },
    {
      id: DEMO.ledgerEntries.bobChargeRevenue,
      transaction_id: DEMO.ledgerTransactions.bobCharge,
      account_id: DEMO.ledgerAccounts.revenue,
      direction: 'CREDIT',
      amount: 1250,
      currency: DEFAULT_CURRENCY,
      settlement_batch_id: null,
      settled_at: null,
      created_at: minutesFrom(base, -120),
    },
  ];

  const usageEvents = [
    {
      id: DEMO.usageEvents.alicePrinting,
      user_id: DEMO.users.alice,
      resource: 'PRINTING',
      units: 50,
      unit_price: 50,
      amount: 2500,
      currency: DEFAULT_CURRENCY,
      usage_reference: 'demo:usage:alice-printing',
      ledger_transaction_id: DEMO.ledgerTransactions.aliceCharge,
      created_at: minutesFrom(base, -120),
    },
    {
      id: DEMO.usageEvents.bobOverage,
      user_id: DEMO.users.bob,
      resource: 'MEETING_ROOM_OVERAGE',
      units: 25,
      unit_price: 50,
      amount: 1250,
      currency: DEFAULT_CURRENCY,
      usage_reference: 'demo:usage:bob-overage',
      ledger_transaction_id: DEMO.ledgerTransactions.bobCharge,
      created_at: minutesFrom(base, -120),
    },
  ];

  return {
    walletAccounts,
    walletLedgerEntries,
    payments,
    ledgerAccounts,
    ledgerTransactions,
    ledgerEntries,
    usageEvents,
  };
}

async function countDemoRows(client, table, ids) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS count FROM ${quoteIdentifier(table)} ` +
      `WHERE id = ANY($1::uuid[])`,
    [ids],
  );
  return Number(result.rows[0]?.count ?? 0);
}

async function demoCounts(client) {
  const counts = {};
  for (const { table, ids } of DEMO_TABLES) {
    counts[table] = await countDemoRows(client, table, ids);
  }
  return counts;
}

async function assertSeedComplete(client) {
  const counts = await demoCounts(client);
  const missing = DEMO_TABLES.filter(({ table, ids }) => counts[table] !== ids.length);
  if (missing.length > 0) {
    throw new Error(
      'Demo seed did not produce every fixed row. ' +
        'A fixed UUID may already belong to non-demo data: ' +
        missing
          .map(({ table, ids }) => `${table} (${counts[table]}/${ids.length})`)
          .join(', '),
    );
  }
  return counts;
}

async function inTransaction(client, callback) {
  await client.query('BEGIN');
  try {
    const result = await callback();
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function seed(client) {
  const base = Date.now();
  const rows = buildRows(base);
  const counts = await inTransaction(client, async () => {
    await insertMany(
      client,
      'wallet_accounts',
      [
        'id',
        'user_id',
        'address',
        'custody_type',
        'status',
        'created_at',
        'updated_at',
      ],
      rows.walletAccounts,
    );
    await insertMany(
      client,
      'wallet_ledger_entries',
      [
        'id',
        'wallet_account_id',
        'type',
        'amount',
        'currency',
        'reason',
        'actor_id',
        'created_at',
      ],
      rows.walletLedgerEntries,
    );
    await insertMany(
      client,
      'payments',
      [
        'id',
        'booking_id',
        'user_id',
        'amount',
        'currency',
        'rail',
        'provider',
        'provider_reference',
        'status',
        'idempotency_key',
        'metadata',
        'expires_at',
        'failure_reason',
        'reconciliation_attempts',
        'provider_error_streak',
        'last_reconciled_at',
        'manual_review_reason',
        'created_at',
        'updated_at',
      ],
      rows.payments,
    );
    await insertMany(
      client,
      'ledger_accounts',
      [
        'id',
        'kind',
        'owner_id',
        'currency',
        'balance',
        'overdraft_limit',
        'external_payout_address',
        'frozen',
        'label',
        'created_at',
        'updated_at',
      ],
      rows.ledgerAccounts,
    );
    await insertMany(
      client,
      'ledger_transactions',
      [
        'id',
        'kind',
        'reference',
        'currency',
        'amount',
        'description',
        'metadata',
        'actor_id',
        'created_at',
      ],
      rows.ledgerTransactions,
    );
    await insertMany(
      client,
      'ledger_entries',
      [
        'id',
        'transaction_id',
        'account_id',
        'direction',
        'amount',
        'currency',
        'settlement_batch_id',
        'settled_at',
        'created_at',
      ],
      rows.ledgerEntries,
    );
    await insertMany(
      client,
      'metered_usage_events',
      [
        'id',
        'user_id',
        'resource',
        'units',
        'unit_price',
        'amount',
        'currency',
        'usage_reference',
        'ledger_transaction_id',
        'created_at',
      ],
      rows.usageEvents,
    );
    return assertSeedComplete(client);
  });

  console.log('Demo seed complete (existing fixed rows were left unchanged).');
  for (const { table } of DEMO_TABLES) {
    console.log(`  ${table}: ${counts[table]} demo row(s)`);
  }
}

async function assertNoNonDemoDependents(client) {
  const checks = [
    {
      table: 'wallet_ledger_entries',
      column: 'wallet_account_id',
      ids: Object.values(DEMO.wallets),
      excludeIds: Object.values(DEMO.walletLedgerEntries),
    },
    { table: 'wallet_key_material', column: 'wallet_account_id', ids: Object.values(DEMO.wallets) },
    { table: 'wallet_key_access_log', column: 'wallet_account_id', ids: Object.values(DEMO.wallets) },
    {
      table: 'ledger_entries',
      column: 'account_id',
      ids: Object.values(DEMO.ledgerAccounts),
      excludeIds: Object.values(DEMO.ledgerEntries),
    },
    {
      table: 'ledger_entries',
      column: 'transaction_id',
      ids: Object.values(DEMO.ledgerTransactions),
      excludeIds: Object.values(DEMO.ledgerEntries),
    },
    { table: 'settlement_payouts', column: 'account_id', ids: Object.values(DEMO.ledgerAccounts) },
    { table: 'settlement_payouts', column: 'ledger_transaction_id', ids: Object.values(DEMO.ledgerTransactions) },
    { table: 'revenue_split_recipients', column: 'account_id', ids: Object.values(DEMO.ledgerAccounts) },
    {
      table: 'metered_usage_events',
      column: 'ledger_transaction_id',
      ids: Object.values(DEMO.ledgerTransactions),
      excludeIds: Object.values(DEMO.usageEvents),
    },
    { table: 'payment_refunds', column: 'payment_id', ids: Object.values(DEMO.payments) },
    { table: 'payment_credit_applications', column: 'payment_id', ids: Object.values(DEMO.payments) },
    { table: 'payment_credit_applications', column: 'ledger_transaction_id', ids: Object.values(DEMO.ledgerTransactions) },
  ];

  for (const check of checks) {
    const values = [check.ids];
    let sql =
      `SELECT COUNT(*)::int AS count FROM ${quoteIdentifier(check.table)} ` +
      `WHERE ${quoteIdentifier(check.column)} = ANY($1::uuid[])`;
    if (check.excludeIds && check.excludeIds.length > 0) {
      values.push(check.excludeIds);
      sql += ' AND id <> ALL($2::uuid[])';
    }
    const result = await client.query(sql, values);
    if (Number(result.rows[0]?.count ?? 0) > 0) {
      throw new Error(
        `Refusing to clear demo data: non-demo dependent rows exist in ` +
          `${check.table}.${check.column}. Remove or reconcile them first.`,
      );
    }
  }
}

async function deleteByIds(client, table, ids) {
  const result = await client.query(
    `DELETE FROM ${quoteIdentifier(table)} WHERE id = ANY($1::uuid[])`,
    [ids],
  );
  return result.rowCount ?? 0;
}

async function clear(client) {
  const removed = await inTransaction(client, async () => {
    await assertNoNonDemoDependents(client);
    const counts = {};
    counts.metered_usage_events = await deleteByIds(
      client,
      'metered_usage_events',
      Object.values(DEMO.usageEvents),
    );
    counts.ledger_entries = await deleteByIds(
      client,
      'ledger_entries',
      Object.values(DEMO.ledgerEntries),
    );
    counts.ledger_transactions = await deleteByIds(
      client,
      'ledger_transactions',
      Object.values(DEMO.ledgerTransactions),
    );
    counts.wallet_ledger_entries = await deleteByIds(
      client,
      'wallet_ledger_entries',
      Object.values(DEMO.walletLedgerEntries),
    );
    counts.payments = await deleteByIds(client, 'payments', Object.values(DEMO.payments));
    counts.wallet_accounts = await deleteByIds(
      client,
      'wallet_accounts',
      Object.values(DEMO.wallets),
    );
    counts.ledger_accounts = await deleteByIds(
      client,
      'ledger_accounts',
      Object.values(DEMO.ledgerAccounts),
    );
    return counts;
  });

  console.log('Demo rows removed:');
  for (const { table } of DEMO_TABLES) {
    console.log(`  ${table}: ${removed[table] ?? 0}`);
  }
}

async function tableInfo(client, table, ids) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS total, ` +
      `COUNT(*) FILTER (WHERE id = ANY($1::uuid[]))::int AS demo ` +
      `FROM ${quoteIdentifier(table)}`,
    [ids],
  );
  const row = result.rows[0] ?? {};
  return {
    total: Number(row.total ?? 0),
    demo: Number(row.demo ?? 0),
  };
}

async function info(client) {
  let anyDemoRows = false;
  console.log('Demo table information:');
  for (const { table, ids } of DEMO_TABLES) {
    const counts = await tableInfo(client, table, ids);
    anyDemoRows = anyDemoRows || counts.demo > 0;
    console.log(`  ${table}: total=${counts.total}, demo=${counts.demo}`);
  }
  console.log(`Demo rows present: ${anyDemoRows ? 'yes' : 'no'}`);
}

function asBigInt(value) {
  return BigInt(String(value ?? 0));
}

function recordCheck(results, name, passed, detail) {
  results.push(passed);
  const label = passed ? 'PASS' : 'FAIL';
  console.log(`[${label}] ${name}${detail ? ` — ${detail}` : ''}`);
}

async function validate(client) {
  const results = [];
  const counts = await demoCounts(client);
  const allDemoRowsPresent = DEMO_TABLES.every(({ table, ids }) => counts[table] === ids.length);
  recordCheck(
    results,
    'all fixed demo rows are present',
    allDemoRowsPresent,
    DEMO_TABLES.map(({ table }) => `${table}=${counts[table]}`).join(', '),
  );

  const transactionResult = await client.query(
    `SELECT t.id, t.reference, t.amount,
       COALESCE(SUM(CASE WHEN e.direction = 'DEBIT' THEN e.amount ELSE 0::bigint END), 0::bigint) AS debits,
       COALESCE(SUM(CASE WHEN e.direction = 'CREDIT' THEN e.amount ELSE 0::bigint END), 0::bigint) AS credits
     FROM ledger_transactions t
     LEFT JOIN ledger_entries e ON e.transaction_id = t.id
     WHERE t.id = ANY($1::uuid[])
     GROUP BY t.id, t.reference, t.amount
     ORDER BY t.id`,
    [Object.values(DEMO.ledgerTransactions)],
  );
  const transactionRows = transactionResult.rows;
  const transactionsBalance =
    transactionRows.length === Object.keys(DEMO.ledgerTransactions).length &&
    transactionRows.every((row) => {
      const amount = asBigInt(row.amount);
      return asBigInt(row.debits) === amount && asBigInt(row.credits) === amount;
    });
  recordCheck(
    results,
    'every seeded ledger transaction has equal debit and credit sides',
    transactionsBalance,
    transactionRows.map((row) => `${row.reference}: ${row.debits}=${row.credits}`).join('; '),
  );

  const paymentResult = await client.query(
    `SELECT id, amount, currency, rail, status FROM payments
     WHERE id = ANY($1::uuid[]) ORDER BY id`,
    [Object.values(DEMO.payments)],
  );
  const paymentRows = paymentResult.rows;
  const seededPaymentStatuses = new Set([
    'INITIATED',
    'AWAITING_CONFIRMATION',
    'CONFIRMED',
    'FAILED',
    'MANUAL_REVIEW',
  ]);
  const paymentsSane =
    paymentRows.length === Object.keys(DEMO.payments).length &&
    paymentRows.every((row) => {
      const amount = asBigInt(row.amount);
      return (
        amount > 0n &&
        amount < 1000000000n &&
        row.currency === DEFAULT_CURRENCY &&
        /^[A-Z]{3}$/.test(row.currency) &&
        row.rail === 'FIAT' &&
        seededPaymentStatuses.has(row.status)
      );
    });
  recordCheck(
    results,
    'seeded payments have positive bounded amounts, currency codes, and the FIAT rail',
    paymentsSane,
    `${paymentRows.length} payment row(s)`,
  );

  const walletResult = await client.query(
    `SELECT a.id, a.custody_type, a.status,
       COALESCE(SUM(CASE WHEN e.type = 'CREDIT' THEN e.amount ELSE -e.amount END), 0::bigint) AS balance,
       COUNT(e.id) FILTER (WHERE e.type = 'CREDIT') AS credit_count,
       COUNT(e.id) FILTER (WHERE e.type = 'DEBIT') AS debit_count
     FROM wallet_accounts a
     LEFT JOIN wallet_ledger_entries e ON e.wallet_account_id = a.id
     WHERE a.id = ANY($1::uuid[])
     GROUP BY a.id, a.custody_type, a.status
     ORDER BY a.id`,
    [Object.values(DEMO.wallets)],
  );
  const walletRows = walletResult.rows;
  const expectedWalletBalances = new Map([
    [DEMO.wallets.alice, 1500000n],
    [DEMO.wallets.bob, 1000000n],
    [DEMO.wallets.carol, 650000n],
  ]);
  const walletBalances =
    walletRows.length === Object.keys(DEMO.wallets).length &&
    walletRows.every(
      (row) =>
        row.status === 'ACTIVE' &&
        asBigInt(row.balance) === expectedWalletBalances.get(row.id) &&
        asBigInt(row.credit_count) > 0n &&
        asBigInt(row.debit_count) > 0n,
    ) &&
    new Set(walletRows.map((row) => row.custody_type)).size === 2;
  recordCheck(
    results,
    'wallet balances derive from both CREDIT and DEBIT entries and are positive',
    walletBalances,
    walletRows.map((row) => `${row.id}: ${row.balance}`).join('; '),
  );

  const accountResult = await client.query(
    `SELECT a.id, a.balance,
       COALESCE(SUM(CASE WHEN e.direction = 'CREDIT' THEN e.amount ELSE -e.amount END), 0::bigint) AS derived_balance
     FROM ledger_accounts a
     LEFT JOIN ledger_entries e ON e.account_id = a.id
     WHERE a.id = ANY($1::uuid[])
     GROUP BY a.id, a.balance
     ORDER BY a.id`,
    [Object.values(DEMO.ledgerAccounts)],
  );
  const accountRows = accountResult.rows;
  const accountBalances =
    accountRows.length === Object.keys(DEMO.ledgerAccounts).length &&
    accountRows.every((row) => asBigInt(row.balance) === asBigInt(row.derived_balance));
  recordCheck(
    results,
    'materialized ledger account balances equal their entry sums',
    accountBalances,
    accountRows.map((row) => `${row.id}: ${row.balance}=${row.derived_balance}`).join('; '),
  );

  const usageResult = await client.query(
    `SELECT id, units, unit_price, amount, ledger_transaction_id
     FROM metered_usage_events
     WHERE id = ANY($1::uuid[]) ORDER BY id`,
    [Object.values(DEMO.usageEvents)],
  );
  const usageRows = usageResult.rows;
  const transactionIds = new Set(Object.values(DEMO.ledgerTransactions));
  const usageSane =
    usageRows.length === Object.keys(DEMO.usageEvents).length &&
    usageRows.every((row) => {
      const units = asBigInt(row.units);
      const unitPrice = asBigInt(row.unit_price);
      return units > 0n && unitPrice > 0n && units * unitPrice === asBigInt(row.amount) && transactionIds.has(row.ledger_transaction_id);
    });
  recordCheck(
    results,
    'metered usage amounts equal units multiplied by unit price and reference seeded transactions',
    usageSane,
    `${usageRows.length} usage row(s)`,
  );

  const passed = results.every(Boolean);
  console.log(`Demo data validation: ${passed ? 'PASS' : 'FAIL'}`);
  return passed;
}

function isLocalHost(host) {
  const normalized = host.trim().toLowerCase();
  return LOCAL_HOSTS.has(normalized) || /^127\./.test(normalized);
}

function safetyCheck(args) {
  const host = process.env.DATABASE_HOST || 'localhost';
  const remoteOverride =
    args.includes('--allow-remote') ||
    ['1', 'true', 'yes', 'on'].includes(
      String(process.env.DEMO_SEED_ALLOW_REMOTE || '').toLowerCase(),
    );
  if (!isLocalHost(host) && !remoteOverride) {
    throw new Error(
      `Refusing to run against non-local DATABASE_HOST "${host}". ` +
        'Use --allow-remote or DEMO_SEED_ALLOW_REMOTE=1 only when this is an intentional demo database.',
    );
  }
  if (!isLocalHost(host)) {
    console.log(`Safety override accepted for non-local DATABASE_HOST "${host}".`);
  } else {
    console.log(`Safety check passed: DATABASE_HOST "${host}" is local.`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args.find((arg) => !arg.startsWith('--'));
  if (!command || !COMMANDS.has(command)) {
    throw new Error(
      'Usage: node scripts/demo-data.js <seed|clear|info|validate> [--allow-remote]',
    );
  }
  safetyCheck(args);

  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });
  let connected = false;
  try {
    await client.connect();
    connected = true;
    if (command === 'seed') {
      await seed(client);
    } else if (command === 'clear') {
      await clear(client);
    } else if (command === 'info') {
      await info(client);
    } else if (command === 'validate') {
      const passed = await validate(client);
      if (!passed) {
        process.exitCode = 1;
      }
    }
  } finally {
    if (connected) {
      await client.end();
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
