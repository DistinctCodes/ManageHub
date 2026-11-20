import { DataSource, LessThan } from 'typeorm';

/** #2094: extra tables the retention job should prune, with their timestamp column. */
export const EXTRA_RETENTION_TARGETS = [
  { table: 'wallet_link_challenges', column: 'createdAt' },
  { table: 'payment_webhook_dead_letters', column: 'createdAt' },
  { table: 'payment_confirmation_events', column: 'createdAt' },
] as const;

export const olderThan = (days: number) => LessThan(new Date(Date.now() - days * 86_400_000));

/** #2095: run a cron body only if this replica wins a Postgres advisory lock. */
export async function withAdvisoryLock(ds: DataSource, key: number, fn: () => Promise<void>) {
  const [{ locked }] = await ds.query('SELECT pg_try_advisory_lock($1) AS locked', [key]);
  if (!locked) return;
  try { await fn(); } finally { await ds.query('SELECT pg_advisory_unlock($1)', [key]); }
}
