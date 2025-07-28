import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { EnergyConsumptionService } from '../src/energy/services/energy-consumption.service';
import { EnergyConsumption } from '../src/energy/entities/energy-consumption.entity';

describe('EnergyConsumptionService', () => {
  let service: EnergyConsumptionService;
  let repository: Repository<EnergyConsumption>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getMany: jest.fn(),
    where: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnergyConsumptionService,
        {
          provide: getRepositoryToken(EnergyConsumption),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<EnergyConsumptionService>(EnergyConsumptionService);
    repository = module.get<Repository<EnergyConsumption>>(
      getRepositoryToken(EnergyConsumption),
    );

    // Reset mocks
    jest.clearAllMocks();
    mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  describe('create', () => {
    it('should create and save energy consumption record', async () => {
      const dto = {
        workspaceId: 'ws-001',
        workspaceName: 'Test Workspace',
        powerConsumptionKwh: 45.5,
        date: '2025-01-15',
        deviceCount: 10,
      };

      const expectedEntity = {
        ...dto,
        date: new Date('2025-01-15'),
        id: 'uuid-123',
        createdAt: new Date(),
      };

      mockRepository.create.mockReturnValue(expectedEntity);
      mockRepository.save.mockResolvedValue(expectedEntity);

      const result = await service.create(dto);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...dto,
        date: new Date('2025-01-15'),
      });
      expect(mockRepository.save).toHaveBeenCalledWith(expectedEntity);
      expect(result).toEqual(expectedEntity);
    });
  });

  describe('findAll', () => {
    it('should return paginated results with filters', async () => {
      const query = {
        workspaceId: 'ws-001',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        limit: 10,
        offset: 0,
      };

      const mockData = [
        {
          id: '1',
          workspaceId: 'ws-001',
          powerConsumptionKwh: 45.5,
          date: new Date('2025-01-15'),
        },
      ];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockData, 1]);

      const result = await service.findAll(query);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'energy.workspaceId = :workspaceId',
        { workspaceId: 'ws-001' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'energy.date BETWEEN :startDate AND :endDate',
        {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
        },
      );
      expect(result).toEqual({
        data: mockData,
        total: 1,
        page: 1,
        limit: 10,
      });
    });

    it('should handle query without filters', async () => {
      const query = { limit: 100, offset: 0 };
      const mockData = [];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockData, 0]);

      const result = await service.findAll(query);

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
      expect(result).toEqual({
        data: mockData,
        total: 0,
        page: 1,
        limit: 100,
      });
    });
  });

  describe('findByWorkspaceAndDate', () => {
    it('should return energy consumption record', async () => {
      const mockRecord = {
        id: '1',
        workspaceId: 'ws-001',
        date: new Date('2025-01-15'),
        powerConsumptionKwh: 45.5,
      };

      mockRepository.findOne.mockResolvedValue(mockRecord);

      const result = await service.findByWorkspaceAndDate('ws-001', '2025-01-15');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          workspaceId: 'ws-001',
          date: new Date('2025-01-15'),
        },
      });
      expect(result).toEqual(mockRecord);
    });

    it('should throw NotFoundException when record not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findByWorkspaceAndDate('ws-001', '2025-01-15'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSummary', () => {
    it('should return workspace summaries', async () => {
      const mockData = [
        {
          workspaceId: 'ws-001',
          workspaceName: 'Test Workspace',
          powerConsumptionKwh: 45.5,
          date: new Date('2025-01-15'),
        },
        {
          workspaceId: 'ws-001',
          workspaceName: 'Test Workspace',
          powerConsumptionKwh: 50.0,
          date: new Date('2025-01-14'),
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockData);

      const result = await service.getSummary();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        workspaceId: 'ws-001',
        workspaceName: 'Test Workspace',
        totalConsumption: 95.5,
        averageDailyConsumption: 47.75,
        daysTracked: 2,
      });
    });

    it('should filter by workspaceId when provided', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.getSummary('ws-001');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'energy.workspaceId = :workspaceId',
        { workspaceId: 'ws-001' },
      );
    });
  });

  describe('generateMockDataForDateRange', () => {
    it('should generate mock data for date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-02');

      mockRepository.findOne.mockResolvedValue(null); // No existing records
      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      await service.generateMockDataForDateRange(startDate, endDate);

      // Should create records for 2 days × 5 workspaces = 10 calls
      expect(mockRepository.save).toHaveBeenCalledTimes(10);
    });
  });

  describe('private methods', () => {
    it('should generate realistic mock consumption data', () => {
      // Access private method through bracket notation for testing
      const mockData = (service as any).generateMockConsumptionData('ws-001');

      expect(mockData).toHaveProperty('powerConsumptionKwh');
      expect(mockData).toHaveProperty('deviceCount');
      expect(mockData).toHaveProperty('metadata');
      expect(typeof mockData.powerConsumptionKwh).toBe('number');
      expect(typeof mockData.deviceCount).toBe('number');
      expect(mockData.powerConsumptionKwh).toBeGreaterThan(0);
      expect(mockData.deviceCount).toBeGreaterThan(0);
    });
  });
});

// test/energy-consumption.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { EnergyConsumptionController } from '../src/energy/controllers/energy-consumption.controller';
import { EnergyConsumptionService } from '../src/energy/services/energy-consumption.service';

describe('EnergyConsumptionController', () => {
  let controller: EnergyConsumptionController;
  let service: EnergyConsumptionService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByWorkspaceAndDate: jest.fn(),
    getSummary: jest.fn(),
    generateMockDataForDateRange: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnergyConsumptionController],
      providers: [
        {
          provide: EnergyConsumptionService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<EnergyConsumptionController>(EnergyConsumptionController);
    service = module.get<EnergyConsumptionService>(EnergyConsumptionService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create energy consumption record', async () => {
      const dto = {
        workspaceId: 'ws-001',
        workspaceName: 'Test Workspace',
        powerConsumptionKwh: 45.5,
        date: '2025-01-15',
      };

      const expectedResult = { id: '1', ...dto, createdAt: new Date() };
      mockService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('should return paginated energy consumption records', async () => {
      const query = { workspaceId: 'ws-001', limit: 10, offset: 0 };
      const expectedResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      };

      mockService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findByWorkspaceAndDate', () => {
    it('should return specific energy consumption record', async () => {
      const workspaceId = 'ws-001';
      const date = '2025-01-15';
      const expectedResult = {
        id: '1',
        workspaceId,
        date: new Date(date),
        powerConsumptionKwh: 45.5,
      };

      mockService.findByWorkspaceAndDate.mockResolvedValue(expectedResult);

      const result = await controller.findByWorkspaceAndDate(workspaceId, date);

      expect(service.findByWorkspaceAndDate).toHaveBeenCalledWith(workspaceId, date);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getSummary', () => {
    it('should return energy consumption summary', async () => {
      const expectedResult = [
        {
          workspaceId: 'ws-001',
          totalConsumption: 100.5,
          averageDailyConsumption: 50.25,
          daysTracked: 2,
        },
      ];

      mockService.getSummary.mockResolvedValue(expectedResult);

      const result = await controller.getSummary();

      expect(service.getSummary).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(expectedResult);
    });

    it('should return summary for specific workspace', async () => {
      const workspaceId = 'ws-001';
      const expectedResult = [
        {
          workspaceId,
          totalConsumption: 100.5,
          averageDailyConsumption: 50.25,
          daysTracked: 2,
        },
      ];

      mockService.getSummary.mockResolvedValue(expectedResult);

      const result = await controller.getSummary(workspaceId);

      expect(service.getSummary).toHaveBeenCalledWith(workspaceId);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('generateMockData', () => {
    it('should trigger mock data generation', async () => {
      const body = {
        startDate: '2025-01-01',
        endDate: '2025-01-07',
      };

      const result = await controller.generateMockData(body);

      expect(service.generateMockDataForDateRange).toHaveBeenCalledWith(
        new Date('2025-01-01'),
        new Date('2025-01-07'),
      );
      expect(result).toEqual({
        message: 'Mock data generation started',
        startDate: '2025-01-01',
        endDate: '2025-01-07',
      });
    });
  });
});
