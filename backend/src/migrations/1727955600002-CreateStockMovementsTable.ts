import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateStockMovementsTable1727955600002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'stock_movements',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['IN', 'OUT'],
          },
          {
            name: 'quantity',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'inventoryItemId',
            type: 'int',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'stock_movements',
      new TableForeignKey({
        columnNames: ['inventoryItemId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'inventory_items',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('stock_movements');
    const foreignKey = table.foreignKeys.find(
      fk => fk.columnNames.indexOf('inventoryItemId') !== -1,
    );
    await queryRunner.dropForeignKey('stock_movements', foreignKey);
    await queryRunner.dropTable('stock_movements');
  }
}