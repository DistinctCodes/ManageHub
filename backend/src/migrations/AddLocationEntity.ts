import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddLocationEntity1751290000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create locations table
    await queryRunner.createTable(
      new Table({
        name: 'locations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'address',
            type: 'varchar',
          },
          {
            name: 'city',
            type: 'varchar',
          },
          {
            name: 'country',
            type: 'varchar',
            default: "'Nigeria'",
          },
          {
            name: 'timezone',
            type: 'varchar',
            default: "'Africa/Lagos'",
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add locationId column to workspaces
    await queryRunner.addColumn(
      'workspaces',
      new TableColumn({
        name: 'locationId',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Create index
    await queryRunner.createIndex(
      'workspaces',
      new TableIndex({
        name: 'IDX_WORKSPACE_LOCATION',
        columnNames: ['locationId'],
      }),
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'workspaces',
      new TableForeignKey({
        columnNames: ['locationId'],
        referencedTableName: 'locations',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Seed default location and assign existing workspaces
    await queryRunner.query(`
      INSERT INTO locations
      ("id", "name", "address", "city", "country", "timezone", "isActive", "createdAt", "updatedAt")
      VALUES
      (
        uuid_generate_v4(),
        'Default Location',
        'Unknown Address',
        'Unknown City',
        'Nigeria',
        'Africa/Lagos',
        true,
        NOW(),
        NOW()
      );
    `);

    await queryRunner.query(`
      UPDATE workspaces
      SET "locationId" = (
        SELECT id
        FROM locations
        WHERE name = 'Default Location'
        LIMIT 1
      )
      WHERE "locationId" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('workspaces');

    const foreignKey = table?.foreignKeys.find(
      fk => fk.columnNames.indexOf('locationId') !== -1,
    );

    if (foreignKey) {
      await queryRunner.dropForeignKey('workspaces', foreignKey);
    }

    await queryRunner.dropIndex('workspaces', 'IDX_WORKSPACE_LOCATION');
    await queryRunner.dropColumn('workspaces', 'locationId');
    await queryRunner.dropTable('locations');
  }
}