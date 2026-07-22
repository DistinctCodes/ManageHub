import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';

/** Database options shared by Nest and the TypeORM CLI. */
export const createDatabaseOptions = (
  env: NodeJS.ProcessEnv = process.env,
): DataSourceOptions => {
  const host = env.DATABASE_HOST || 'localhost';
  const sslRequired =
    env.NODE_ENV === 'production' ||
    env.PGSSLMODE === 'require' ||
    env.DATABASE_SSL === 'true' ||
    host.includes('neon.tech');

  return {
    type: 'postgres',
    host,
    port: Number(env.DATABASE_PORT || 5432),
    username: env.DATABASE_USERNAME,
    password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    entities: ['src/**/*.entity.ts'],
    migrations: ['src/migrations/*{.ts,.js}'],
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,
    ssl: sslRequired ? { rejectUnauthorized: false } : false,
  };
};

/** Nest-specific options layered on top of the shared connection options. */
export const createNestDatabaseOptions = (
  env: NodeJS.ProcessEnv = process.env,
): TypeOrmModuleOptions => ({
  ...createDatabaseOptions(env),
  autoLoadEntities: true,
});
