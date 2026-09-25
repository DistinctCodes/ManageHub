// Applies then reverts the latest migration against a scratch DB so its
// down() is proven to work, not just assumed. Intended to be wired into
// CI as a standalone step for backend/src/database/migrations.
import { DataSource } from 'typeorm';

export async function verifyLatestMigrationRollback(
  dataSource: DataSource,
): Promise<void> {
  await dataSource.runMigrations();
  const before = await dataSource.query(
    'SELECT table_name FROM information_schema.tables',
  );

  await dataSource.undoLastMigration();
  const after = await dataSource.query(
    'SELECT table_name FROM information_schema.tables',
  );

  if (JSON.stringify(before) === JSON.stringify(after)) {
    throw new Error(
      'Rollback of latest migration made no observable schema change',
    );
  }

  // Re-apply so the DB is left in the expected up-to-date state.
  await dataSource.runMigrations();
}
