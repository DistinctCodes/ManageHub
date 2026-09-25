import 'dotenv/config';
import { DataSource } from 'typeorm';

// Pool bounds are env-configurable (issue #1778) so staging/prod can be
// tuned without a code change. node-postgres (the underlying driver) reads
// `min`/`max` from the `extra` block below; DB_POOL_MIN defaults to 2 and
// DB_POOL_MAX to 10, matching node-postgres's own defaults.
export const DB_POOL_MIN = process.env.DB_POOL_MIN
  ? parseInt(process.env.DB_POOL_MIN, 10)
  : 2;
export const DB_POOL_MAX = process.env.DB_POOL_MAX
  ? parseInt(process.env.DB_POOL_MAX, 10)
  : 10;

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT
    ? parseInt(process.env.DATABASE_PORT, 10)
    : 5432,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  extra: {
    min: DB_POOL_MIN,
    max: DB_POOL_MAX,
  },
});

export default AppDataSource;
