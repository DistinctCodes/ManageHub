import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateAssetAuditsTable1728000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'asset_audits',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'assetId',
            type: 'uuid',
          },
          {
            name: 'auditDate',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'auditedBy',
            type: 'varchar',
          },
          {
            name: 'status',
            type: 'varchar',
          },
          {
            name: 'remarks',
            type: 'varchar',
            isNullable: true,
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'asset_audits',
      new TableForeignKey({
        columnNames: ['assetId'],
        referencedColumnNames: ['id'],
        entity: 'assets',
        referencedTableName: 'assets',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('asset_audits', 'FK_ASSET_AUDIT_ASSET');
    await queryRunner.dropTable('asset_audits');
  }
}
