/**
 * TypeORM CLI DataSource
 *
 * Used exclusively by the TypeORM CLI for migration commands:
 *   npm run migration:generate -- src/migrations/MigrationName
 *   npm run migration:run
 *   npm run migration:revert
 *
 * This file is NOT imported by the NestJS application — the app uses
 * TypeOrmModule.forRootAsync() in app.module.ts with autoLoadEntities.
 */

import 'dotenv/config';
import { DataSource } from 'typeorm';

const host = process.env.DATABASE_HOST ?? 'localhost';
const sslRequired =
  process.env.NODE_ENV === 'production' ||
  process.env.PGSSLMODE === 'require' ||
  process.env.DATABASE_SSL === 'true' ||
  host.includes('neon.tech');

export default new DataSource({
  type: 'postgres',
  host,
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,

  // Entity discovery via glob — picks up every *.entity.ts under src/
  entities: ['src/**/*.entity.ts'],

  // Migration files live in src/migrations/
  migrations: ['src/migrations/**/*.ts'],
  migrationsTableName: 'typeorm_migrations',

  synchronize: false,
  ssl: sslRequired ? { rejectUnauthorized: false } : false,
});
