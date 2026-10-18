/**
 * BE-140 index audit: fails CI if a hot-path listing query would
 * sequential-scan instead of using an index, guarding the two endpoints
 * most likely to grow large (GET /credits/statement and GET /payments).
 *
 * Run after `npm run migration:run` against a freshly-migrated database:
 *   node scripts/index-audit.js
 */
const { Client } = require('pg');
const { randomUUID } = require('crypto');

const AUDIT_ROW_COUNT = 5_000;

const QUERIES = [
  {
    name: 'GET /credits/statement (ledger_entries by account, newest first)',
    sql: `EXPLAIN SELECT * FROM "ledger_entries"
          WHERE "account_id" = $1
          ORDER BY "created_at" DESC LIMIT 100`,
  },
  {
    name: 'GET /payments member list (by user)',
    sql: `EXPLAIN SELECT * FROM "payments"
          WHERE "user_id" = $1
          ORDER BY "created_at" DESC`,
  },
  {
    name: 'admin manual-review queue (by status, oldest first)',
    sql: `EXPLAIN SELECT * FROM "payments"
          WHERE "status" = $1
          ORDER BY "updated_at" ASC`,
    parameters: ['MANUAL_REVIEW'],
  },
];

async function main() {
  const auditUserId = randomUUID();
  const fixturePrefix = `be140-index-audit-${randomUUID()}`;
  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });
  await client.connect();

  let failed = false;
  let transactionOpen = false;
  try {
    // The CI database is freshly migrated and empty. PostgreSQL correctly
    // prefers sequential scans on empty tables even when the needed indexes
    // exist, so seed selective, representative rows inside a transaction.
    // The rollback below guarantees this audit leaves the database unchanged.
    await client.query('BEGIN');
    transactionOpen = true;

    await client.query(
      `INSERT INTO "ledger_accounts" ("id", "kind", "owner_id", "currency")
       VALUES ($1, 'USER', gen_random_uuid(), 'USD')`,
      [auditUserId],
    );
    await client.query(
      `INSERT INTO "ledger_accounts" ("id", "kind", "owner_id", "currency")
       SELECT md5($1 || '-account-' || i)::uuid,
              'USER', md5($1 || '-owner-' || i)::uuid, 'USD'
       FROM generate_series(1, $2::int - 1) AS rows(i)`,
      [fixturePrefix, AUDIT_ROW_COUNT],
    );
    await client.query(
      `INSERT INTO "ledger_transactions" ("id", "kind", "reference", "currency", "amount")
       SELECT md5($1 || '-transaction-' || i)::uuid,
              'ADJUSTMENT', $1 || '-reference-' || i, 'USD', 1
       FROM generate_series(1, $2::int) AS rows(i)`,
      [fixturePrefix, AUDIT_ROW_COUNT],
    );
    await client.query(
      `INSERT INTO "ledger_entries"
         ("transaction_id", "account_id", "direction", "amount", "currency", "created_at")
       SELECT md5($1 || '-transaction-' || i)::uuid,
              CASE WHEN i % 100 = 0 THEN $2::uuid
                   ELSE md5($1 || '-account-' || ((i % ($3::int - 1)) + 1))::uuid
              END,
              'CREDIT', 1, 'USD', now() - (i * interval '1 second')
       FROM generate_series(1, $3::int) AS rows(i)`,
      [fixturePrefix, auditUserId, AUDIT_ROW_COUNT],
    );
    await client.query(
      `INSERT INTO "payments"
         ("booking_id", "user_id", "amount", "currency", "rail", "status",
          "idempotency_key", "created_at", "updated_at")
       SELECT md5($2 || '-booking-' || i)::uuid,
              CASE WHEN i = 1 THEN $1::uuid
                   ELSE md5($2 || '-user-' || i)::uuid
              END,
              1, 'USD', 'FIAT',
              CASE WHEN i % 100 = 0 THEN 'MANUAL_REVIEW'::"payments_status_enum"
                   ELSE 'CONFIRMED'::"payments_status_enum"
              END,
              $2 || '-idempotency-' || i,
              now() - (i * interval '1 second'),
              now() - (i * interval '1 second')
       FROM generate_series(1, $3::int) AS rows(i)`,
      [auditUserId, fixturePrefix, AUDIT_ROW_COUNT],
    );

    // Refresh planner statistics so EXPLAIN reflects the seeded distribution.
    await client.query('ANALYZE "ledger_entries"');
    await client.query('ANALYZE "payments"');

    for (const query of QUERIES) {
      const result = await client.query(
        query.sql,
        query.parameters ?? [auditUserId],
      );
      const plan = result.rows
        .map((row) => Object.values(row).join(' '))
        .join('\n');
      const seqScan = /Seq Scan/i.test(plan);

      console.log(`\n[${query.name}]`);
      console.log(plan);
      if (seqScan) {
        failed = true;
        console.log('  -> FAIL: sequential scan detected (missing or weak index)');
      } else {
        console.log('  -> OK');
      }
    }
  } finally {
    if (transactionOpen) {
      try {
        await client.query('ROLLBACK');
        // ANALYZE statistics are maintained outside the data transaction.
        // Refresh them after rollback so a local database's stats stay true.
        await client.query('ANALYZE "ledger_entries"');
        await client.query('ANALYZE "payments"');
      } finally {
        await client.end();
      }
    } else {
      await client.end();
    }
  }

  if (failed) {
    console.error('\nIndex audit FAILED: a hot-path query is sequential-scanning.');
    process.exit(1);
  }
  console.log('\nIndex audit passed: no sequential scans on the audited hot paths.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
