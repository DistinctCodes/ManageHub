import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentsTable1755784074000 implements MigrationInterface {
  name = 'CreatePaymentsTable1755784074000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "payments_rail_enum" AS ENUM (
        'FIAT', 'STELLAR_CUSTODIAL', 'STELLAR_EXTERNAL'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "payments_status_enum" AS ENUM (
        'INITIATED', 'AWAITING_CONFIRMATION', 'CONFIRMED',
        'FAILED', 'EXPIRED', 'REFUNDED', 'PARTIALLY_REFUNDED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "booking_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "amount" bigint NOT NULL,
        "currency" varchar(3) NOT NULL,
        "rail" "payments_rail_enum" NOT NULL,
        "provider" varchar,
        "provider_reference" varchar,
        "status" "payments_status_enum" NOT NULL DEFAULT 'INITIATED',
        "idempotency_key" varchar NOT NULL,
        "metadata" jsonb,
        "expires_at" timestamptz,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "pk_payments" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_payments_booking_id" ON "payments" ("booking_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_payments_user_id" ON "payments" ("user_id")
    `);

    // Idempotency: a retried request (same user, same key) must resolve to
    // the same row.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_payments_user_id_idempotency_key"
      ON "payments" ("user_id", "idempotency_key")
    `);

    // Concurrency safety: at most one non-terminal Payment per booking,
    // independent of idempotency key, so two different initiate requests
    // racing for the same booking can't both create a row.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_payments_booking_id_non_terminal"
      ON "payments" ("booking_id")
      WHERE "status" IN ('INITIATED', 'AWAITING_CONFIRMATION')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "uq_payments_booking_id_non_terminal"`);
    await queryRunner.query(`DROP INDEX "uq_payments_user_id_idempotency_key"`);
    await queryRunner.query(`DROP INDEX "idx_payments_user_id"`);
    await queryRunner.query(`DROP INDEX "idx_payments_booking_id"`);
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TYPE "payments_status_enum"`);
    await queryRunner.query(`DROP TYPE "payments_rail_enum"`);
  }
}
