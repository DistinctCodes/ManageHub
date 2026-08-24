import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Micropayment credit ledger, revenue splits and batch settlement
 * (issue #1575).
 *
 * The CHECK constraints below deliberately duplicate validation the
 * services already do. Ledger correctness is the kind of thing that must
 * hold even for a row inserted by a migration, a script or a future
 * caller that forgot the service — so "amounts are positive" and "a split
 * recipient is internal xor external" are enforced by the database too.
 */
export class CreateCreditLedgerTables1787408900000 implements MigrationInterface {
  name = 'CreateCreditLedgerTables1787408900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "ledger_accounts_kind_enum" AS ENUM (
        'USER', 'TREASURY', 'REVENUE', 'PLATFORM_FEE', 'HUB_OPERATOR',
        'REFERRAL'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "ledger_transactions_kind_enum" AS ENUM (
        'TOP_UP', 'CHARGE', 'REVENUE_SPLIT', 'SETTLEMENT', 'REVERSAL',
        'ADJUSTMENT'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "ledger_entries_direction_enum" AS ENUM ('DEBIT', 'CREDIT')
    `);
    await queryRunner.query(`
      CREATE TYPE "settlement_batches_status_enum" AS ENUM (
        'PENDING', 'IN_PROGRESS', 'SETTLED', 'PARTIALLY_SETTLED', 'FAILED',
        'ABANDONED'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "settlement_batches_mode_enum" AS ENUM (
        'DISTRIBUTION', 'NET_PAYABLE'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "settlement_payouts_status_enum" AS ENUM (
        'PENDING', 'SUBMITTED', 'CONFIRMED', 'FAILED'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "metered_usage_events_resource_enum" AS ENUM (
        'RESOURCE_MINUTES', 'PRINTING', 'MEETING_ROOM_OVERAGE'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "payment_credit_applications_kind_enum" AS ENUM (
        'TOP_UP', 'REVENUE_SPLIT'
      )
    `);

    // One account per user, plus the singleton system accounts. `balance`
    // is a materialized cache of the append-only entries — it exists so an
    // overdraft check can be O(1) and so a charge has a single row to lock.
    await queryRunner.query(`
      CREATE TABLE "ledger_accounts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "kind" "ledger_accounts_kind_enum" NOT NULL,
        "owner_id" uuid,
        "currency" varchar(3) NOT NULL,
        "balance" bigint NOT NULL DEFAULT 0,
        "overdraft_limit" bigint NOT NULL DEFAULT 0,
        "external_payout_address" varchar,
        "frozen" boolean NOT NULL DEFAULT false,
        "label" varchar,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "pk_ledger_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "ck_ledger_accounts_overdraft_limit"
          CHECK ("overdraft_limit" >= 0)
      )
    `);
    // An owned account (user / hub operator / referrer) is unique per
    // owner and currency...
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_ledger_accounts_owned"
      ON "ledger_accounts" ("kind", "owner_id", "currency")
      WHERE "owner_id" IS NOT NULL
    `);
    // ...and a system account is a singleton per kind and currency. Two
    // partial indexes rather than one, because NULL owner_id would not
    // collide under a plain unique index.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_ledger_accounts_system"
      ON "ledger_accounts" ("kind", "currency")
      WHERE "owner_id" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ledger_accounts_owner_id"
      ON "ledger_accounts" ("owner_id")
    `);

    // `reference` is the transaction-level idempotency guard: a replayed
    // charge, a re-run settlement pass or a resumed batch job all collide
    // on it and get the original transaction back.
    await queryRunner.query(`
      CREATE TABLE "ledger_transactions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "kind" "ledger_transactions_kind_enum" NOT NULL,
        "reference" varchar NOT NULL,
        "currency" varchar(3) NOT NULL,
        "amount" bigint NOT NULL,
        "description" text,
        "metadata" jsonb,
        "actor_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "pk_ledger_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "ck_ledger_transactions_amount" CHECK ("amount" > 0)
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_ledger_transactions_reference"
      ON "ledger_transactions" ("reference")
    `);

    await queryRunner.query(`
      CREATE TABLE "revenue_split_configs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "description" text,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "pk_revenue_split_configs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_revenue_split_configs_name"
      ON "revenue_split_configs" ("name")
    `);

    // "Basis points sum to 10000" is a property of the whole set and so
    // is validated in RevenueSplitService; what a row-level CHECK *can*
    // guarantee is that no single share is nonsensical, and that a
    // recipient is internal xor external.
    await queryRunner.query(`
      CREATE TABLE "revenue_split_recipients" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "config_id" uuid NOT NULL,
        "label" varchar NOT NULL,
        "basis_points" int NOT NULL,
        "account_id" uuid,
        "external_address" varchar,
        "sort_order" int NOT NULL DEFAULT 0,
        CONSTRAINT "pk_revenue_split_recipients" PRIMARY KEY ("id"),
        CONSTRAINT "ck_revenue_split_recipients_basis_points"
          CHECK ("basis_points" > 0 AND "basis_points" <= 10000),
        CONSTRAINT "ck_revenue_split_recipients_target"
          CHECK (("account_id" IS NULL) <> ("external_address" IS NULL)),
        CONSTRAINT "fk_revenue_split_recipients_config"
          FOREIGN KEY ("config_id") REFERENCES "revenue_split_configs"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "fk_revenue_split_recipients_account"
          FOREIGN KEY ("account_id") REFERENCES "ledger_accounts"("id")
          ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_revenue_split_recipients_config_id"
      ON "revenue_split_recipients" ("config_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "settlement_batches" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "status" "settlement_batches_status_enum" NOT NULL DEFAULT 'PENDING',
        "currency" varchar(3) NOT NULL,
        "mode" "settlement_batches_mode_enum" NOT NULL,
        "split_config_id" uuid,
        "period_end" timestamptz NOT NULL,
        "total_amount" bigint NOT NULL DEFAULT 0,
        "claimed_entry_count" int NOT NULL DEFAULT 0,
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "pk_settlement_batches" PRIMARY KEY ("id"),
        CONSTRAINT "fk_settlement_batches_split_config"
          FOREIGN KEY ("split_config_id")
          REFERENCES "revenue_split_configs"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_settlement_batches_status"
      ON "settlement_batches" ("status")
    `);

    // Append-only. The two settlement markers are separate on purpose:
    // `settlement_batch_id` is the CLAIM (this entry belongs to one batch
    // and no other), `settled_at` is the SETTLED marker, written only once
    // the payout has actually been confirmed by the rail.
    await queryRunner.query(`
      CREATE TABLE "ledger_entries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "transaction_id" uuid NOT NULL,
        "account_id" uuid NOT NULL,
        "direction" "ledger_entries_direction_enum" NOT NULL,
        "amount" bigint NOT NULL,
        "currency" varchar(3) NOT NULL,
        "settlement_batch_id" uuid,
        "settled_at" timestamptz,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "pk_ledger_entries" PRIMARY KEY ("id"),
        CONSTRAINT "ck_ledger_entries_amount" CHECK ("amount" > 0),
        CONSTRAINT "fk_ledger_entries_transaction"
          FOREIGN KEY ("transaction_id")
          REFERENCES "ledger_transactions"("id")
          ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "fk_ledger_entries_account"
          FOREIGN KEY ("account_id") REFERENCES "ledger_accounts"("id")
          ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "fk_ledger_entries_settlement_batch"
          FOREIGN KEY ("settlement_batch_id")
          REFERENCES "settlement_batches"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ledger_entries_transaction_id"
      ON "ledger_entries" ("transaction_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ledger_entries_account_id"
      ON "ledger_entries" ("account_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ledger_entries_settlement_batch_id"
      ON "ledger_entries" ("settlement_batch_id")
    `);
    // The settlement claim scan only ever looks at unclaimed entries, so
    // the index it uses excludes everything already accounted for — which
    // is the vast majority of the table on a busy ledger.
    await queryRunner.query(`
      CREATE INDEX "idx_ledger_entries_unclaimed"
      ON "ledger_entries" ("account_id", "created_at")
      WHERE "settlement_batch_id" IS NULL
    `);

    // `idempotency_key` is what the payout rail dedupes on, which is what
    // makes re-executing a crashed batch safe.
    await queryRunner.query(`
      CREATE TABLE "settlement_payouts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "batch_id" uuid NOT NULL,
        "label" varchar NOT NULL,
        "account_id" uuid,
        "external_address" varchar,
        "basis_points" int,
        "amount" bigint NOT NULL,
        "currency" varchar(3) NOT NULL,
        "status" "settlement_payouts_status_enum" NOT NULL DEFAULT 'PENDING',
        "idempotency_key" varchar NOT NULL,
        "on_chain_reference" varchar,
        "ledger_transaction_id" uuid,
        "attempts" int NOT NULL DEFAULT 0,
        "last_error" text,
        "confirmed_at" timestamptz,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "pk_settlement_payouts" PRIMARY KEY ("id"),
        CONSTRAINT "ck_settlement_payouts_amount" CHECK ("amount" > 0),
        CONSTRAINT "fk_settlement_payouts_batch"
          FOREIGN KEY ("batch_id") REFERENCES "settlement_batches"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "fk_settlement_payouts_account"
          FOREIGN KEY ("account_id") REFERENCES "ledger_accounts"("id")
          ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "fk_settlement_payouts_ledger_transaction"
          FOREIGN KEY ("ledger_transaction_id")
          REFERENCES "ledger_transactions"("id")
          ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_settlement_payouts_idempotency_key"
      ON "settlement_payouts" ("idempotency_key")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_settlement_payouts_batch_id"
      ON "settlement_payouts" ("batch_id")
    `);
    // Powers the "does this account already have an in-flight payout?"
    // guard that stops the same balance being committed to two batches.
    await queryRunner.query(`
      CREATE INDEX "idx_settlement_payouts_account_in_flight"
      ON "settlement_payouts" ("account_id")
      WHERE "status" IN ('PENDING', 'SUBMITTED')
    `);

    await queryRunner.query(`
      CREATE TABLE "metered_usage_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "resource" "metered_usage_events_resource_enum" NOT NULL,
        "units" int NOT NULL,
        "unit_price" bigint NOT NULL,
        "amount" bigint NOT NULL,
        "currency" varchar(3) NOT NULL,
        "usage_reference" varchar NOT NULL,
        "ledger_transaction_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "pk_metered_usage_events" PRIMARY KEY ("id"),
        CONSTRAINT "ck_metered_usage_events_positive"
          CHECK ("units" > 0 AND "unit_price" > 0 AND "amount" > 0),
        CONSTRAINT "fk_metered_usage_events_ledger_transaction"
          FOREIGN KEY ("ledger_transaction_id")
          REFERENCES "ledger_transactions"("id")
          ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_metered_usage_events_usage_reference"
      ON "metered_usage_events" ("usage_reference")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_metered_usage_events_user_id"
      ON "metered_usage_events" ("user_id")
    `);

    // Lives on the credits side so a split config can be attached to a
    // Payment without the payments module knowing this module exists.
    await queryRunner.query(`
      CREATE TABLE "payment_credit_applications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "payment_id" uuid NOT NULL,
        "kind" "payment_credit_applications_kind_enum" NOT NULL,
        "split_config_id" uuid,
        "ledger_transaction_id" uuid,
        "applied_at" timestamptz,
        "last_error" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "pk_payment_credit_applications" PRIMARY KEY ("id"),
        CONSTRAINT "fk_payment_credit_applications_payment"
          FOREIGN KEY ("payment_id") REFERENCES "payments"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "fk_payment_credit_applications_split_config"
          FOREIGN KEY ("split_config_id")
          REFERENCES "revenue_split_configs"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT "fk_payment_credit_applications_ledger_transaction"
          FOREIGN KEY ("ledger_transaction_id")
          REFERENCES "ledger_transactions"("id")
          ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_payment_credit_applications_payment_id"
      ON "payment_credit_applications" ("payment_id")
    `);
    // The sweep looks for confirmed-but-unapplied rows.
    await queryRunner.query(`
      CREATE INDEX "idx_payment_credit_applications_unapplied"
      ON "payment_credit_applications" ("payment_id")
      WHERE "applied_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "idx_payment_credit_applications_unapplied"`,
    );
    await queryRunner.query(
      `DROP INDEX "uq_payment_credit_applications_payment_id"`,
    );
    await queryRunner.query(`DROP TABLE "payment_credit_applications"`);
    await queryRunner.query(`DROP INDEX "idx_metered_usage_events_user_id"`);
    await queryRunner.query(
      `DROP INDEX "uq_metered_usage_events_usage_reference"`,
    );
    await queryRunner.query(`DROP TABLE "metered_usage_events"`);
    await queryRunner.query(
      `DROP INDEX "idx_settlement_payouts_account_in_flight"`,
    );
    await queryRunner.query(`DROP INDEX "idx_settlement_payouts_batch_id"`);
    await queryRunner.query(
      `DROP INDEX "uq_settlement_payouts_idempotency_key"`,
    );
    await queryRunner.query(`DROP TABLE "settlement_payouts"`);
    await queryRunner.query(`DROP INDEX "idx_ledger_entries_unclaimed"`);
    await queryRunner.query(
      `DROP INDEX "idx_ledger_entries_settlement_batch_id"`,
    );
    await queryRunner.query(`DROP INDEX "idx_ledger_entries_account_id"`);
    await queryRunner.query(`DROP INDEX "idx_ledger_entries_transaction_id"`);
    await queryRunner.query(`DROP TABLE "ledger_entries"`);
    await queryRunner.query(`DROP INDEX "idx_settlement_batches_status"`);
    await queryRunner.query(`DROP TABLE "settlement_batches"`);
    await queryRunner.query(
      `DROP INDEX "idx_revenue_split_recipients_config_id"`,
    );
    await queryRunner.query(`DROP TABLE "revenue_split_recipients"`);
    await queryRunner.query(`DROP INDEX "uq_revenue_split_configs_name"`);
    await queryRunner.query(`DROP TABLE "revenue_split_configs"`);
    await queryRunner.query(`DROP INDEX "uq_ledger_transactions_reference"`);
    await queryRunner.query(`DROP TABLE "ledger_transactions"`);
    await queryRunner.query(`DROP INDEX "idx_ledger_accounts_owner_id"`);
    await queryRunner.query(`DROP INDEX "uq_ledger_accounts_system"`);
    await queryRunner.query(`DROP INDEX "uq_ledger_accounts_owned"`);
    await queryRunner.query(`DROP TABLE "ledger_accounts"`);
    await queryRunner.query(
      `DROP TYPE "payment_credit_applications_kind_enum"`,
    );
    await queryRunner.query(`DROP TYPE "metered_usage_events_resource_enum"`);
    await queryRunner.query(`DROP TYPE "settlement_payouts_status_enum"`);
    await queryRunner.query(`DROP TYPE "settlement_batches_mode_enum"`);
    await queryRunner.query(`DROP TYPE "settlement_batches_status_enum"`);
    await queryRunner.query(`DROP TYPE "ledger_entries_direction_enum"`);
    await queryRunner.query(`DROP TYPE "ledger_transactions_kind_enum"`);
    await queryRunner.query(`DROP TYPE "ledger_accounts_kind_enum"`);
  }
}
