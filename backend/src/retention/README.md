# Data retention policy (issue BE-144)

This module owns the scheduled housekeeping job that stops the two
append-only audit tables from growing without bound:

- `wallet_key_access_log` — one row per key-decrypt/signing operation in
  `KeyCustodyService` or wallet-account lifecycle event, regardless of
  outcome. Never contains key material.
- `metered_usage_events` — one row per metered usage charge on the credit
  ledger.

The two tables grow on signing/key-lifecycle events and metered usage events
respectively. The policy below is the source of truth for how long rows are
kept and what happens when they age out.

## Policy

| Table                | Retention window (default) | Action at expiry                                    |
| -------------------- | -------------------------- | --------------------------------------------------- |
| `wallet_key_access_log` | 6 months (configurable) | Hard delete by `RetentionService` |
| `metered_usage_events`  | 6 months (configurable) | Hard delete by `RetentionService` |

- The window is measured from the row's timestamp column —
  `occurred_at` for `wallet_key_access_log`, `created_at` for
  `metered_usage_events`.
- Windows are configured with `DATA_RETENTION_MONTHS` (default `6`). Set
  `DATA_RETENTION_ENABLED=false` to disable the job entirely.
- Deletion runs in bounded batches of `DATA_RETENTION_BATCH_SIZE` (default
  `1000`) rows per `DELETE`, so an arbitrarily large backlog is drained
  without holding one long table lock. An interrupted pass resumes simply
  by running again — already-deleted rows no longer match the cutoff.
- Deletion is a hard DELETE, not a soft-archive. No complementary `ledger`
  tables are touched: `ledger_transactions` / `ledger_entries` are
  deliberately append-only and never pruned, so the financial ledger's
  historical invariant (documented in `src/credits/README.md`) is
  unaffected.

## Dry run (issue #1948)

Set `DATA_RETENTION_DRY_RUN=true` (or call `RetentionService.purgeExpiredData`
with `{ dryRun: true }`) to preview a pass without changing any row. A dry
run reports the number of rows each table *would* lose and a bounded sample
of their ids, both in the log line and on `/metrics`
(`managehub_retention_dry_run_rows`). Use it before changing
`DATA_RETENTION_MONTHS` so the blast radius of a window change is known in
advance.

## Failure alerting and metrics (issue #1948)

A failed pass is no longer silent:

- the failure is counted (`managehub_retention_failures_total`) and the
  last-run status is published on `/metrics`
  (`managehub_retention_last_run_success`,
  `managehub_retention_last_run_timestamp_seconds`,
  `managehub_retention_last_run_dry_run`);
- a successful pass increments `managehub_retention_rows_deleted_total`
  per table;
- an SMTP alert is emailed to `SUPPORT_EMAIL`, reusing the same best-effort
  nodemailer path as the reconciliation and credit-spike alerts. Missing
  SMTP configuration makes the email a no-op; a delivery failure only warns.

## Compliance note

The default 6-month window is an operator decision, not a legal one. No
external compliance requirement currently governs these tables. If a
legislative or contractual obligation (e.g. an archive-before-delete rule)
is introduced, change `DATA_RETENTION_MONTHS` and, where required, swap the
hard delete for an archive step before this point is reached.

## Scheduling

`RetentionService` runs the purge nightly at 03:00 UTC via a
`@Cron(CronExpression.EVERY_DAY_AT_3AM)` job. The decorated handler is thin
and delegates to the directly-testable core, `RetentionService.purgeExpiredData()`,
so the cutoff computation and repository deletes are covered by unit tests.

## Where the rows come from

- `wallet_key_access_log` — written by `KeyCustodyService.logAccess` and
  `WalletsService.softDeleteWallet`
  (`src/wallets/key-custody/key-custody.service.ts` and
  `src/wallets/wallets.service.ts`).
- `metered_usage_events` — written by `MeteredUsageService.recordUsage`
  (`src/credits/metered-usage.service.ts`).
