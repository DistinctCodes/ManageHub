import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentReconciliationFields1755870474000 implements MigrationInterface {
  name = 'AddPaymentReconciliationFields1755870474000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "payments_failure_reason_enum" AS ENUM (
        'DECLINED', 'EXPIRED', 'PROVIDER_ERROR', 'ABANDONED'
      )
    `);

    // New failure-taxonomy/escalation statuses (issue #1572) on top of
    // #1570's original enum.
    await queryRunner.query(`
      ALTER TYPE "payments_status_enum" ADD VALUE IF NOT EXISTS 'MANUAL_REVIEW'
    `);
    await queryRunner.query(`
      ALTER TYPE "payments_status_enum" ADD VALUE IF NOT EXISTS 'DISPUTED'
    `);
    await queryRunner.query(`
      ALTER TYPE "payments_status_enum" ADD VALUE IF NOT EXISTS 'VOIDED'
    `);

    await queryRunner.query(`
      ALTER TABLE "payments"
        ADD COLUMN "failure_reason" "payments_failure_reason_enum",
        ADD COLUMN "reconciliation_attempts" integer NOT NULL DEFAULT 0,
        ADD COLUMN "provider_error_streak" integer NOT NULL DEFAULT 0,
        ADD COLUMN "last_reconciled_at" timestamptz,
        ADD COLUMN "manual_review_reason" text
    `);

    await queryRunner.query(`
      CREATE TABLE "payment_refunds" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "payment_id" uuid NOT NULL,
        "amount" bigint NOT NULL,
        "reason" text NOT NULL,
        "actor_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "pk_payment_refunds" PRIMARY KEY ("id"),
        CONSTRAINT "fk_payment_refunds_payment" FOREIGN KEY ("payment_id")
          REFERENCES "payments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_payment_refunds_payment_id" ON "payment_refunds" ("payment_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_payment_refunds_payment_id"`);
    await queryRunner.query(`DROP TABLE "payment_refunds"`);
    await queryRunner.query(`
      ALTER TABLE "payments"
        DROP COLUMN "manual_review_reason",
        DROP COLUMN "last_reconciled_at",
        DROP COLUMN "provider_error_streak",
        DROP COLUMN "reconciliation_attempts",
        DROP COLUMN "failure_reason"
    `);
    // Postgres has no DROP VALUE for enums — reverting MANUAL_REVIEW /
    // DISPUTED / VOIDED would require recreating payments_status_enum,
    // which isn't safe to do automatically without knowing whether any row
    // already uses them.
    await queryRunner.query(`DROP TYPE "payments_failure_reason_enum"`);
  }
}
