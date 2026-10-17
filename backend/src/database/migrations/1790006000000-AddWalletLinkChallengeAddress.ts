import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWalletLinkChallengeAddress1790006000000 implements MigrationInterface {
  name = 'AddWalletLinkChallengeAddress1790006000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wallet_link_challenges"
      ADD COLUMN "address" varchar NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wallet_link_challenges"
      DROP COLUMN "address"
    `);
  }
}
