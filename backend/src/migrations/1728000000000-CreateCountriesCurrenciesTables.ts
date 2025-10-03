import { MigrationInterface, QueryRunner, Table, Index, ForeignKey } from 'typeorm';

export class CreateCountriesCurrenciesTables1728000000000 implements MigrationInterface {
  name = 'CreateCountriesCurrenciesTables1728000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create countries table
    await queryRunner.createTable(
      new Table({
        name: 'countries',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'iso2Code',
            type: 'varchar',
            length: '2',
            isUnique: true,
          },
          {
            name: 'iso3Code',
            type: 'varchar',
            length: '3',
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'commonName',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'numericCode',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'callingCode',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'capital',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'region',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'subregion',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'area',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'population',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'isDeleted',
            type: 'boolean',
            default: false,
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
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deletedAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create currencies table
    await queryRunner.createTable(
      new Table({
        name: 'currencies',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '3',
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'symbol',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'exchangeRate',
            type: 'decimal',
            precision: 10,
            scale: 4,
            default: 1.0,
          },
          {
            name: 'isBaseCurrency',
            type: 'boolean',
            default: false,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'isDeleted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'decimalPlaces',
            type: 'int',
            default: 2,
          },
          {
            name: 'countryId',
            type: 'uuid',
            isNullable: true,
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
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deletedAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create exchange_rates table
    await queryRunner.createTable(
      new Table({
        name: 'exchange_rates',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'fromCurrencyId',
            type: 'uuid',
          },
          {
            name: 'toCurrencyId',
            type: 'uuid',
          },
          {
            name: 'rate',
            type: 'decimal',
            precision: 15,
            scale: 6,
          },
          {
            name: 'effectiveDate',
            type: 'timestamptz',
          },
          {
            name: 'expiryDate',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'source',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'isDeleted',
            type: 'boolean',
            default: false,
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
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deletedAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex('countries', new Index('IDX_countries_iso2Code', ['iso2Code']));
    await queryRunner.createIndex('countries', new Index('IDX_countries_iso3Code', ['iso3Code']));
    await queryRunner.createIndex('countries', new Index('IDX_countries_name', ['name']));
    await queryRunner.createIndex('countries', new Index('IDX_countries_isActive', ['isActive']));
    await queryRunner.createIndex('countries', new Index('IDX_countries_isDeleted', ['isDeleted']));

    await queryRunner.createIndex('currencies', new Index('IDX_currencies_code', ['code']));
    await queryRunner.createIndex('currencies', new Index('IDX_currencies_isBaseCurrency', ['isBaseCurrency']));
    await queryRunner.createIndex('currencies', new Index('IDX_currencies_isActive', ['isActive']));
    await queryRunner.createIndex('currencies', new Index('IDX_currencies_isDeleted', ['isDeleted']));

    await queryRunner.createIndex('exchange_rates', new Index('IDX_exchange_rates_fromCurrencyId', ['fromCurrencyId']));
    await queryRunner.createIndex('exchange_rates', new Index('IDX_exchange_rates_toCurrencyId', ['toCurrencyId']));
    await queryRunner.createIndex('exchange_rates', new Index('IDX_exchange_rates_effectiveDate', ['effectiveDate']));
    await queryRunner.createIndex('exchange_rates', new Index('IDX_exchange_rates_isActive', ['isActive']));
    await queryRunner.createIndex('exchange_rates', new Index('IDX_exchange_rates_isDeleted', ['isDeleted']));

    // Create foreign key constraints
    await queryRunner.createForeignKey(
      'currencies',
      new ForeignKey({
        columnNames: ['countryId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'countries',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'exchange_rates',
      new ForeignKey({
        columnNames: ['fromCurrencyId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'currencies',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'exchange_rates',
      new ForeignKey({
        columnNames: ['toCurrencyId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'currencies',
        onDelete: 'CASCADE',
      }),
    );

    // Insert some initial data
    await queryRunner.query(`
      INSERT INTO countries (id, "iso2Code", "iso3Code", name, "commonName", "callingCode", capital, region, subregion, area, population) VALUES
      ('550e8400-e29b-41d4-a716-446655440001', 'US', 'USA', 'United States of America', 'United States', '+1', 'Washington, D.C.', 'Americas', 'North America', 9833517.85, 331002651),
      ('550e8400-e29b-41d4-a716-446655440002', 'CA', 'CAN', 'Canada', 'Canada', '+1', 'Ottawa', 'Americas', 'North America', 9984670.0, 37742154),
      ('550e8400-e29b-41d4-a716-446655440003', 'GB', 'GBR', 'United Kingdom of Great Britain and Northern Ireland', 'United Kingdom', '+44', 'London', 'Europe', 'Northern Europe', 242495.0, 67215293),
      ('550e8400-e29b-41d4-a716-446655440004', 'DE', 'DEU', 'Federal Republic of Germany', 'Germany', '+49', 'Berlin', 'Europe', 'Western Europe', 357114.0, 83783942),
      ('550e8400-e29b-41d4-a716-446655440005', 'FR', 'FRA', 'French Republic', 'France', '+33', 'Paris', 'Europe', 'Western Europe', 551695.0, 65273511)
    `);

    await queryRunner.query(`
      INSERT INTO currencies (id, code, name, symbol, "exchangeRate", "isBaseCurrency", "decimalPlaces", "countryId") VALUES
      ('650e8400-e29b-41d4-a716-446655440001', 'USD', 'US Dollar', '$', 1.0, true, 2, '550e8400-e29b-41d4-a716-446655440001'),
      ('650e8400-e29b-41d4-a716-446655440002', 'CAD', 'Canadian Dollar', 'C$', 1.35, false, 2, '550e8400-e29b-41d4-a716-446655440002'),
      ('650e8400-e29b-41d4-a716-446655440003', 'GBP', 'British Pound Sterling', '£', 0.79, false, 2, '550e8400-e29b-41d4-a716-446655440003'),
      ('650e8400-e29b-41d4-a716-446655440004', 'EUR', 'Euro', '€', 0.85, false, 2, '550e8400-e29b-41d4-a716-446655440004'),
      ('650e8400-e29b-41d4-a716-446655440005', 'JPY', 'Japanese Yen', '¥', 110.0, false, 0, null)
    `);

    await queryRunner.query(`
      INSERT INTO exchange_rates (id, "fromCurrencyId", "toCurrencyId", rate, "effectiveDate", source) VALUES
      ('750e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440002', 1.35, NOW(), 'ECB'),
      ('750e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440003', 0.79, NOW(), 'ECB'),
      ('750e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440004', 0.85, NOW(), 'ECB'),
      ('750e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440005', 110.0, NOW(), 'ECB')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('exchange_rates');
    await queryRunner.dropTable('currencies');
    await queryRunner.dropTable('countries');
  }
}
