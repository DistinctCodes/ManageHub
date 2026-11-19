import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentCancelledStatus1790008000000 implements MigrationInterface {
  name = 'AddPaymentCancelledStatus1790008000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "payments_status_enum" ADD VALUE IF NOT EXISTS 'CANCELLED'
    `);
  }

  public async down(): Promise<void> {
  }
}
