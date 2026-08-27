/**
 * BE-140 index audit: fails CI if a hot-path listing query would
 * sequential-scan instead of using an index, guarding the two endpoints
 * most likely to grow large (GET /credits/statement and GET /payments).
 *
 * Run after `npm run migration:run` against a freshly-migrated database:
 *   node scripts/index-audit.js
 */
const { Client } = require('pg');

const DUMMY_UUID = '00000000-0000-0000-0000-000000000000';

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
          WHERE "status" = 'MANUAL_REVIEW'
          ORDER BY "updated_at" ASC`,
  },
];

async function main() {
  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });
  await client.connect();

  let failed = false;
  for (const query of QUERIES) {
    const result = await client.query(query.sql, [DUMMY_UUID]);
    const plan = result.rows.map((row) => Object.values(row).join(' ')).join('\n');
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

  await client.end();

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
