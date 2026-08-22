import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSorobanFailureReasons1787401777618
  implements MigrationInterface
{
  name = 'AddSorobanFailureReasons1787401777618';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Soroban-specific failure taxonomy (issue #1574) on top of #1572's enum.
    await queryRunner.query(`
      ALTER TYPE "payments_failure_reason_enum" ADD VALUE IF NOT EXISTS 'SIMULATION_FAILED'
    `);
    await queryRunner.query(`
      ALTER TYPE "payments_failure_reason_enum" ADD VALUE IF NOT EXISTS 'INSUFFICIENT_FEE'
    `);
    await queryRunner.query(`
      ALTER TYPE "payments_failure_reason_enum" ADD VALUE IF NOT EXISTS 'SEQUENCE_CONFLICT'
    `);
    await queryRunner.query(`
      ALTER TYPE "payments_failure_reason_enum" ADD VALUE IF NOT EXISTS 'TRANSACTION_EXPIRED'
    `);
    await queryRunner.query(`
      ALTER TYPE "payments_failure_reason_enum" ADD VALUE IF NOT EXISTS 'CONTRACT_REVERTED'
    `);
  }

  public async down(): Promise<void> {
    // Postgres has no DROP VALUE for enums — reverting these would require
    // recreating payments_failure_reason_enum, which isn't safe to do
    // automatically without knowing whether any row already uses them
    // (same tradeoff already accepted in AddPaymentReconciliationFields).
  }
}
