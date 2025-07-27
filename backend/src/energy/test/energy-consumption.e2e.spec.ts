import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { EnergyModule } from '../src/energy/energy.module';
import { EnergyConsumption } from '../src/energy/entities/energy-consumption.entity';

describe('Energy Consumption (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [EnergyConsumption],
          synchronize: true,
        }),
        EnergyModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/energy-consumption (POST)', () => {
    it('should create energy consumption record', () => {
      const dto = {
        workspaceId: 'ws-001',
        workspaceName: 'Test Workspace',
        powerConsumptionKwh: 45.5,
        date: '2025-01-15',
        deviceCount: 10,
      };

      return request(app.getHttpServer())
        .post('/energy-consumption')
        .send(dto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.workspaceId).toBe(dto.workspaceId);
          expect(res.body.powerConsumptionKwh).toBe('45.50');
          expect(res.body.deviceCount).toBe(dto.deviceCount);
        });
    });

    it('should validate required fields', () => {
      const invalidDto = {
        workspaceId: 'ws-001',
        // Missing required fields
      };

      return request(app.getHttpServer())
        .post('/energy-consumption')
        .send(invalidDto)
        .expect(400);
    });

    it('should validate power consumption is positive', () => {
      const invalidDto = {
        workspaceId: 'ws-001',
        workspaceName: 'Test Workspace',
        powerConsumptionKwh: -10, // Invalid negative value
        date: '2025-01-15',
      };

      return request(app.getHttpServer())
        .post('/energy-consumption')
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('/energy-consumption (GET)', () => {
    beforeEach(async () => {
      // Seed test data
      const testData = [
        {
          workspaceId: 'ws-001',
          workspaceName: 'Workspace 1',
          powerConsumptionKwh: 45.5,
          date: '2025-01-15',
          deviceCount: 10,
        },
        {
          workspaceId: 'ws-002',
          workspaceName: 'Workspace 2',
          powerConsumptionKwh: 30.2,
          date: '2025-01-15',
          deviceCount: 8,
        },
        {
          workspaceId: 'ws-001',
          workspaceName: 'Workspace 1',
          powerConsumptionKwh: 50.0,
          date: '2025-01-16',
          deviceCount: 12,
        },
      ];

      for (const data of testData) {
        await request(app.getHttpServer())
          .post('/energy-consumption')
          .send(data);
      }
    });

    it('should return all energy consumption records', () => {
      return request(app.getHttpServer())
        .get('/energy-consumption')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(res.body).toHaveProperty('limit');
          expect(res.body.total).toBe(3);
          expect(res.body.data).toHaveLength(3);
        });
    });

    it('should filter by workspaceId', () => {
      return request(app.getHttpServer())
        .get('/energy-consumption?workspaceId=ws-001')
        .expect(200)
        .expect((res) => {
          expect(res.body.total).toBe(2);
          expect(res.body.data.every(item => item.workspaceId === 'ws-001')).toBe(true);
        });
    });

    it('should filter by date range', () => {
      return request(app.getHttpServer())
        .get('/energy-consumption?startDate=2025-01-16&endDate=2025-01-16')
        .expect(200)
        .expect((res) => {
          expect(res.body.total).toBe(1);
          expect(res.body.data[0].date).toBe('2025-01-16');
        });
    });

    it('should paginate results', () => {
      return request(app.getHttpServer())
        .get('/energy-consumption?limit=2&offset=0')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(2);
          expect(res.body.limit).toBe(2);
          expect(res.body.page).toBe(1);
        });
    });
  });

  describe('/energy-consumption/summary (GET)', () => {
    beforeEach(async () => {
      // Seed test data
      const testData = [
        {
          workspaceId: 'ws-001',
          workspaceName: 'Workspace 1',
          powerConsumptionKwh: 45.5,
          date: '2025-01-15',
          deviceCount: 10,
        },
        {
          workspaceId: 'ws-001',
          workspaceName: 'Workspace 1',
          powerConsumptionKwh: 50.0,
          date: '2025-01-16',
          deviceCount: 12,
        },
        {
          workspaceId: 'ws-002',
          workspaceName: 'Workspace 2',
          powerConsumptionKwh: 30.2,
          date: '2025-01-15',
          deviceCount: 8,
        },
      ];

      for (const data of testData) {
        await request(app.getHttpServer())
          .post('/energy-consumption')
          .send(data);
      }
    });

    it('should return summary for all workspaces', () => {
      return request(app.getHttpServer())
        .get('/energy-consumption/summary')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveLength(2);
          
          const ws001Summary = res.body.find(s => s.workspaceId === 'ws-001');
          expect(ws001Summary).toBeDefined();
          expect(ws001Summary.totalConsumption).toBe(95.5);
          expect(ws001Summary.averageDailyConsumption).toBe(47.75);
          expect(ws001Summary.daysTracked).toBe(2);
          expect(ws001Summary.peakConsumptionDay.consumption).toBe(50);
          expect(ws001Summary.lowestConsumptionDay.consumption).toBe(45.5);
        });
    });

    it('should return summary for specific workspace', () => {
      return request(app.getHttpServer())
        .get('/energy-consumption/summary?workspaceId=ws-002')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveLength(1);
          expect(res.body[0].workspaceId).toBe('ws-002');
          expect(res.body[0].totalConsumption).toBe(30.2);
        });
    });
  });

  describe('/energy-consumption/:workspaceId/:date (GET)', () => {
    beforeEach(async () => {
      const testData = {
        workspaceId: 'ws-001',
        workspaceName: 'Test Workspace',
        powerConsumptionKwh: 45.5,
        date: '2025-01-15',
        deviceCount: 10,
      };

      await request(app.getHttpServer())
        .post('/energy-consumption')
        .send(testData);
    });

    it('should return specific energy consumption record', () => {
      return request(app.getHttpServer())
        .get('/energy-consumption/ws-001/2025-01-15')
        .expect(200)
        .expect((res) => {
          expect(res.body.workspaceId).toBe('ws-001');
          expect(res.body.date).toBe('2025-01-15');
          expect(res.body.powerConsumptionKwh).toBe('45.50');
        });
    });

    it('should return 404 for non-existent record', () => {
      return request(app.getHttpServer())
        .get('/energy-consumption/ws-999/2025-01-15')
        .expect(404);
    });
  });

  describe('/energy-consumption/generate-mock-data (POST)', () => {
    it('should accept mock data generation request', () => {
      const body = {
        startDate: '2025-01-01',
        endDate: '2025-01-07',
      };

      return request(app.getHttpServer())
        .post('/energy-consumption/generate-mock-data')
        .send(body)
        .expect(202)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Mock data generation started',
            startDate: '2025-01-01',
            endDate: '2025-01-07',
          });
        });
    });
  });
});
