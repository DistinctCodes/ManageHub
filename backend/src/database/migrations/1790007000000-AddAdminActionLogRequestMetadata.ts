import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Issue #1939: admin audit records could not say where an action came from.
 * Adds nullable forensic columns so every admin action written after this
 * migration stores the caller's IP and User-Agent.
 */
export class AddAdminActionLogRequestMetadata1790007000000
  implements MigrationInterface
{
  name = 'AddAdminActionLogRequestMetadata1790007000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "admin_action_logs"
      ADD COLUMN "ip" varchar(64) NULL,
      ADD COLUMN "user_agent" varchar(512) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "admin_action_logs"
      DROP COLUMN "user_agent",
      DROP COLUMN "ip"
    `);
  }
}
