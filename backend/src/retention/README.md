# Data retention policy (issue BE-144)

This module owns the scheduled housekeeping job that stops the two
append-only audit tables from growing without bound:

- `wallet_key_access_log` — one row per key-decrypt/signing operation in
  `KeyCustodyService`, regardless of outcome. Never contains key material.
- `metered_usage_events` — one row per metered usage charge on the credit
  ledger.

Both tables currently grow on every signing attempt and every metered
usage event respectively. The policy below is the source of truth for how
long rows are kept and what happens when they age out.

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
- Deletion is a hard DELETE, not a soft-archive. No complementary `ledger`
  tables are touched: `ledger_transactions` / `ledger_entries` are
  deliberately append-only and never pruned, so the financial ledger's
  historical invariant (documented in `src/credits/README.md`) is
  unaffected.

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

- `wallet_key_access_log` — written by `KeyCustodyService.logAccess`
  (`src/wallets/key-custody/key-custody.service.ts`).
- `metered_usage_events` — written by `MeteredUsageService.recordUsage`
  (`src/credits/metered-usage.service.ts`).
