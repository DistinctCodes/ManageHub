import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerificationFields1727897400000
  implements MigrationInterface
{
  name = 'AddEmailVerificationFields1727897400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "isVerified" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "verificationToken" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "verificationTokenExpiry" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "lastVerificationEmailSent" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "lastVerificationEmailSent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "verificationTokenExpiry"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "verificationToken"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isVerified"`);
  }
}
