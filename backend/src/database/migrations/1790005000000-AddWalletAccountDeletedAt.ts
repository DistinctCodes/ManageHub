import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWalletAccountDeletedAt1790005000000 implements MigrationInterface {
  name = 'AddWalletAccountDeletedAt1790005000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wallet_accounts"
      ADD COLUMN "deleted_at" timestamptz NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wallet_accounts"
      DROP COLUMN "deleted_at"
    `);
  }
}
