import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from '../auth/entities/refreshToken.entity';
import { ProcurementRequest } from '../procurement/entities/procurement-request.entity';
import { InventoryItem } from '../inventory-items/inventory-items.entity';
import { StockMovement } from '../inventory-items/stock-movement.entity';

config();

const configService = new ConfigService();

export default new DataSource({
  type: 'postgres',
  host: configService.get('DATABASE_HOST'),
  port: +configService.get('DATABASE_PORT'),
  username: configService.get('DATABASE_USERNAME'),
  password: configService.get('DATABASE_PASSWORD'),
  database: configService.get('DATABASE_NAME'),
  ssl:
    configService.get('NODE_ENV') === 'production'
      ? { rejectUnauthorized: false }
      : false,
  entities: [User, RefreshToken, ProcurementRequest, InventoryItem, StockMovement],
  migrations: ['src/migrations/*.ts'],
  synchronize: false, // Always false for migrations
});
