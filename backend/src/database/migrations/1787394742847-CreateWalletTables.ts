import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWalletTables1787394742847 implements MigrationInterface {
  name = 'CreateWalletTables1787394742847';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "wallet_accounts_custody_type_enum" AS ENUM (
        'CUSTODIAL', 'EXTERNAL'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "wallet_accounts_status_enum" AS ENUM (
        'PENDING', 'ACTIVE', 'DISABLED'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "wallet_ledger_entries_type_enum" AS ENUM ('CREDIT', 'DEBIT')
    `);

    // No secret material — see wallet_key_material.
    await queryRunner.query(`
      CREATE TABLE "wallet_accounts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "address" varchar NOT NULL,
        "custody_type" "wallet_accounts_custody_type_enum" NOT NULL,
        "status" "wallet_accounts_status_enum" NOT NULL DEFAULT 'PENDING',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "pk_wallet_accounts" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_wallet_accounts_user_id"
      ON "wallet_accounts" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_wallet_accounts_address" ON "wallet_accounts" ("address")
    `);
    // At most one EXTERNAL wallet_account can claim a given external
    // address — custodial addresses (freshly generated, never reused) are
    // exempt so this can't collide with them.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_wallet_accounts_external_address"
      ON "wallet_accounts" ("address")
      WHERE "custody_type" = 'EXTERNAL'
    `);

    // Envelope-encrypted custodial secret. Only KeyCustodyService reads
    // this table. Never contains plaintext key material.
    await queryRunner.query(`
      CREATE TABLE "wallet_key_material" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "wallet_account_id" uuid NOT NULL,
        "kms_key_id" varchar NOT NULL,
        "wrapped_data_key" text NOT NULL,
        "wrapped_data_key_iv" varchar NOT NULL,
        "wrapped_data_key_tag" varchar NOT NULL,
        "encrypted_secret" text NOT NULL,
        "encrypted_secret_iv" varchar NOT NULL,
        "encrypted_secret_tag" varchar NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "pk_wallet_key_material" PRIMARY KEY ("id"),
        CONSTRAINT "fk_wallet_key_material_wallet_account" FOREIGN KEY ("wallet_account_id")
          REFERENCES "wallet_accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_wallet_key_material_wallet_account_id"
      ON "wallet_key_material" ("wallet_account_id")
    `);

    // Append-only decrypt audit log.
    await queryRunner.query(`
      CREATE TABLE "wallet_key_access_log" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "wallet_account_id" uuid NOT NULL,
        "actor" varchar NOT NULL,
        "reason" varchar NOT NULL,
        "successful" boolean NOT NULL,
        "occurred_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "pk_wallet_key_access_log" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_wallet_key_access_log_wallet_account_id"
      ON "wallet_key_access_log" ("wallet_account_id")
    `);

    // Single-use challenge-response nonces for external wallet linking.
    await queryRunner.query(`
      CREATE TABLE "wallet_link_challenges" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "nonce" varchar NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "consumed_at" timestamptz,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "pk_wallet_link_challenges" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_wallet_link_challenges_user_id"
      ON "wallet_link_challenges" ("user_id")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_wallet_link_challenges_nonce"
      ON "wallet_link_challenges" ("nonce")
    `);

    // Store-credit style balance ledger for custodial wallets — see
    // wallet_ledger_entries' entity doc for why this isn't a real
    // on-chain balance.
    await queryRunner.query(`
      CREATE TABLE "wallet_ledger_entries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "wallet_account_id" uuid NOT NULL,
        "type" "wallet_ledger_entries_type_enum" NOT NULL,
        "amount" bigint NOT NULL,
        "currency" varchar(3) NOT NULL,
        "reason" text NOT NULL,
        "actor_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "pk_wallet_ledger_entries" PRIMARY KEY ("id"),
        CONSTRAINT "fk_wallet_ledger_entries_wallet_account" FOREIGN KEY ("wallet_account_id")
          REFERENCES "wallet_accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_wallet_ledger_entries_wallet_account_id"
      ON "wallet_ledger_entries" ("wallet_account_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_wallet_ledger_entries_wallet_account_id"`);
    await queryRunner.query(`DROP TABLE "wallet_ledger_entries"`);
    await queryRunner.query(`DROP INDEX "uq_wallet_link_challenges_nonce"`);
    await queryRunner.query(`DROP INDEX "idx_wallet_link_challenges_user_id"`);
    await queryRunner.query(`DROP TABLE "wallet_link_challenges"`);
    await queryRunner.query(`DROP INDEX "idx_wallet_key_access_log_wallet_account_id"`);
    await queryRunner.query(`DROP TABLE "wallet_key_access_log"`);
    await queryRunner.query(`DROP INDEX "uq_wallet_key_material_wallet_account_id"`);
    await queryRunner.query(`DROP TABLE "wallet_key_material"`);
    await queryRunner.query(`DROP INDEX "uq_wallet_accounts_external_address"`);
    await queryRunner.query(`DROP INDEX "idx_wallet_accounts_address"`);
    await queryRunner.query(`DROP INDEX "uq_wallet_accounts_user_id"`);
    await queryRunner.query(`DROP TABLE "wallet_accounts"`);
    await queryRunner.query(`DROP TYPE "wallet_ledger_entries_type_enum"`);
    await queryRunner.query(`DROP TYPE "wallet_accounts_status_enum"`);
    await queryRunner.query(`DROP TYPE "wallet_accounts_custody_type_enum"`);
  }
}
