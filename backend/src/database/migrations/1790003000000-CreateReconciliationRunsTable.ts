import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReconciliationRunsTable1790003000000 implements MigrationInterface {
  name = 'CreateReconciliationRunsTable1790003000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "reconciliation_runs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "started_at" timestamptz NOT NULL DEFAULT now(),
        "finished_at" timestamptz,
        "duration_ms" integer,
        "candidates" integer NOT NULL DEFAULT 0,
        "resolved" integer NOT NULL DEFAULT 0,
        "pending" integer NOT NULL DEFAULT 0,
        "provider_errors" integer NOT NULL DEFAULT 0,
        "escalated_to_manual_review" integer NOT NULL DEFAULT 0,
        "expired_swept" integer NOT NULL DEFAULT 0,
        "outcome" text,
        "error" text,
        "details" jsonb,
        CONSTRAINT "pk_reconciliation_runs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_reconciliation_runs_started_at"
      ON "reconciliation_runs" ("started_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_reconciliation_runs_outcome"
      ON "reconciliation_runs" ("outcome")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_reconciliation_runs_outcome"`);
    await queryRunner.query(`DROP INDEX "idx_reconciliation_runs_started_at"`);
    await queryRunner.query(`DROP TABLE "reconciliation_runs"`);
  }
}
