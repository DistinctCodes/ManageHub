import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryAlertsModule } from './inventory-alerts.module';
import { InventoryItem } from './entities/inventory-item.entity';
import { Alert } from './entities/alert.entity';

describe('InventoryAlertsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          dropSchema: true,
          entities: [InventoryItem, Alert],
          synchronize: true,
          logging: false,
        }),
        InventoryAlertsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/inventory/alerts (GET) returns empty initially', () => {
    return request(app.getHttpServer())
      .get('/inventory/alerts')
      .expect(200)
      .expect((res) => {
        if (typeof res.body.total !== 'number') throw new Error('missing total');
        if (!Array.isArray(res.body.alerts)) throw new Error('alerts missing');
      });
  });
});
