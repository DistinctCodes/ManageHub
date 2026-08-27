import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminActionLogsTable1790001000000
  implements MigrationInterface
{
  name = 'CreateAdminActionLogsTable1790001000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "admin_action_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "actor_id" uuid NOT NULL,
        "action" varchar(64) NOT NULL,
        "target_type" varchar(64) NOT NULL,
        "target_id" uuid,
        "detail" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "pk_admin_action_logs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_admin_action_logs_target" ON "admin_action_logs" ("target_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_admin_action_logs_action" ON "admin_action_logs" ("action")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_admin_action_logs_created_at" ON "admin_action_logs" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_admin_action_logs_created_at"`);
    await queryRunner.query(`DROP INDEX "idx_admin_action_logs_action"`);
    await queryRunner.query(`DROP INDEX "idx_admin_action_logs_target"`);
    await queryRunner.query(`DROP TABLE "admin_action_logs"`);
  }
}
