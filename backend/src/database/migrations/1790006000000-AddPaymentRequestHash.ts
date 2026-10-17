import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentRequestHash1790006000000 implements MigrationInterface {
  name = 'AddPaymentRequestHash1790006000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payments"
      ADD COLUMN "request_hash" varchar(64) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payments"
      DROP COLUMN "request_hash"
    `);
  }
}
