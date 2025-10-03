import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateProcurementRequestsTable1727955600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'procurement_requests',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'itemName', type: 'varchar', length: '255', isNullable: false },
          { name: 'quantity', type: 'int', isNullable: false },
          { name: 'requestedById', type: 'uuid', isNullable: false },
          { name: 'status', type: 'varchar', isNullable: false, default: "'PENDING'" },
          { name: 'createdAt', type: 'timestamp with time zone', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp with time zone', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'procurement_requests',
      new TableForeignKey({
        columnNames: ['requestedById'],
        referencedColumnNames: ['id'],
referencedTableName: 'users',
        onDelete: 'RESTRICT',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('procurement_requests');
    const fk = table?.foreignKeys.find((f) => f.columnNames.includes('requestedById'));
    if (fk) {
      await queryRunner.dropForeignKey('procurement_requests', fk);
    }
    await queryRunner.dropTable('procurement_requests', true);
  }
}