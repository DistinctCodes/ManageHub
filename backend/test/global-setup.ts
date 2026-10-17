import 'reflect-metadata';
import './setup-env';
import { DataSource, DataSourceOptions } from 'typeorm';
import { AppDataSource } from '../src/database/data-source';

/**
 * Prepares the e2e database before any suite runs (issue #1953).
 *
 * 1. Applies the checked-in migrations (the same command CI runs). On a
 *    fresh local `managehub_e2e` this builds the whole schema; in CI, where
 *    `migration:run` already ran, it is a no-op.
 * 2. Synchronizes the schema from the entities. The checked-in migrations do
 *    not yet create every table (e.g. `payment_confirmation_events` and
 *    `payment_webhook_dead_letters`), so without this the webhook path would
 *    500 on a migrated database. This is test-only — the application itself
 *    keeps `synchronize: false`.
 */
export default async function globalSetup(): Promise<void> {
  const dataSource = await AppDataSource.initialize();
  try {
    await dataSource.runMigrations();
  } finally {
    await dataSource.destroy();
  }

  const syncDataSource = new DataSource({
    ...(AppDataSource.options as DataSourceOptions),
    synchronize: true,
  } as DataSourceOptions);
  await syncDataSource.initialize();
  await syncDataSource.destroy();
}
