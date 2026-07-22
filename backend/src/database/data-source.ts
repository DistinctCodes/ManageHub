import 'dotenv/config';
import { DataSource } from 'typeorm';
import { createDatabaseOptions } from './typeorm.config';

/** TypeORM CLI datasource. Invoke it through the migration npm scripts. */
export default new DataSource(createDatabaseOptions());
