// maintenance/maintenance.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceService } from './maintenance.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MaintenanceRequest, MaintenanceStatus } from './entities/maintenance.entity';
import { Repository } from 'typeorm';

describe('MaintenanceService', () => {
  let service: MaintenanceService;
  let repo: Repository<MaintenanceRequest>;

  const mockRequest: MaintenanceRequest = {
    id: 'uuid-123',
    title: 'Power outage',
    description: 'No electricity in block A',
    status: MaintenanceStatus.OPEN,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepo = {
    create: jest.fn().mockReturnValue(mockRequest),
    save: jest.fn().mockResolvedValue(mockRequest),
    find: jest.fn().mockResolvedValue([mockRequest]),
    findOne: jest.fn().mockResolvedValue(mockRequest),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceService,
        { provide: getRepositoryToken(MaintenanceRequest), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<MaintenanceService>(MaintenanceService);
    repo = module.get<Repository<MaintenanceRequest>>(getRepositoryToken(MaintenanceRequest));
  });

  it('should create a maintenance request', async () => {
    const dto = { title: 'Power outage', description: 'No electricity' };
    expect(await service.create(dto)).toEqual(mockRequest);
    expect(repo.create).toHaveBeenCalledWith(dto);
    expect(repo.save).toHaveBeenCalledWith(mockRequest);
  });

  it('should find all requests', async () => {
    expect(await service.findAll()).toEqual([mockRequest]);
    expect(repo.find).toHaveBeenCalled();
  });

  it('should find one request', async () => {
    expect(await service.findOne('uuid-123')).toEqual(mockRequest);
  });

  it('should update a request', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue(mockRequest);
    expect(await service.update('uuid-123', { status: MaintenanceStatus.CLOSED })).toEqual(mockRequest);
  });

  it('should remove a request', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue(mockRequest);
    await service.remove('uuid-123');
    expect(repo.remove).toHaveBeenCalledWith(mockRequest);
  });
});
