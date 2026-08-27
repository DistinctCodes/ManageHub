import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * BE-140 index audit: the two most likely-to-grow read endpoints were
 * running against single-column indexes that did not cover their filter +
 * sort columns, leaving ORDER BY / status sweeps to sort in memory or
 * seq-scan as the tables grow.
 *
 *  - GET /credits/statement → ledger_entries filtered by account_id,
 *    ordered by created_at DESC. The existing single-column account_id
 *    index covers the filter but not the ordering.
 *  - GET /payments (member list) → filtered by user_id (+ status in the
 *    admin/manual-review paths). Existing separate user_id index, but no
 *    coverage for status-swept reconciliation queries.
 */
export class AddIndexAuditIndexes1790002000000 implements MigrationInterface {
  name = 'AddIndexAuditIndexes1790002000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "idx_ledger_entries_account_created" ` +
        `ON "ledger_entries" ("account_id", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payments_user_status" ` +
        `ON "payments" ("user_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payments_status_updated" ` +
        `ON "payments" ("status", "updated_at" ASC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_payments_status_updated"`);
    await queryRunner.query(`DROP INDEX "idx_payments_user_status"`);
    await queryRunner.query(`DROP INDEX "idx_ledger_entries_account_created"`);
  }
}
