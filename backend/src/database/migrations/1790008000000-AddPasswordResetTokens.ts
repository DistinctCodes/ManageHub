import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResetTokens1790008000000 implements MigrationInterface {
  name = 'AddPasswordResetTokens1790008000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "password_reset_token_hash" varchar,
      ADD COLUMN "password_reset_expires_at" TIMESTAMPTZ
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "password_reset_expires_at",
      DROP COLUMN "password_reset_token_hash"
    `);
  }
}