import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserLastLoginAt1790004000000 implements MigrationInterface {
  name = 'AddUserLastLoginAt1790004000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "last_login_at" timestamptz NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "last_login_at"
    `);
  }
}
