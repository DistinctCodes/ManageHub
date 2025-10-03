import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcurementService } from './procurement.service';
import { ProcurementRequest } from '../entities/procurement-request.entity';
import { UsersService } from '../../users/providers/users.service';
import { ProcurementStatus } from '../enums/procurement-status.enum';
import { ASSET_REGISTRATION_TOKEN } from '../interfaces/asset-registration.interface';

const userStub = { id: 'user-1' } as any;

describe('ProcurementService', () => {
  let service: ProcurementService;
  let repo: Repository<ProcurementRequest>;
  let usersService: UsersService;
  const assetRegistration = { registerAsset: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcurementService,
        {
          provide: getRepositoryToken(ProcurementRequest),
          useValue: {
            create: jest.fn((x) => x),
            save: jest.fn(async (x) => ({ id: 'req-1', ...x })),
            findOne: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findUserById: jest.fn(async () => userStub),
          },
        },
        { provide: ASSET_REGISTRATION_TOKEN, useValue: assetRegistration },
      ],
    }).compile();

    service = module.get<ProcurementService>(ProcurementService);
    repo = module.get(getRepositoryToken(ProcurementRequest));
    usersService = module.get<UsersService>(UsersService);
  });

  it('should create a procurement request', async () => {
    const dto = { itemName: 'Laptop', quantity: 2 };
    const result = await service.createRequest(dto as any, userStub.id);
    expect(usersService.findUserById).toHaveBeenCalledWith(userStub.id);
    expect(result.itemName).toBe('Laptop');
    expect(result.quantity).toBe(2);
    expect(result.status).toBe(ProcurementStatus.PENDING);
  });

  it('should approve a procurement request and call asset registration', async () => {
    (repo.findOne as any).mockResolvedValue({
      id: 'req-1',
      itemName: 'Chair',
      quantity: 5,
      status: ProcurementStatus.PENDING,
      requestedBy: userStub,
    });

    const result = await service.approveRequest('req-1');
    expect(result.status).toBe(ProcurementStatus.APPROVED);
    expect(assetRegistration.registerAsset).toHaveBeenCalledWith({
      procurementRequestId: 'req-1',
      itemName: 'Chair',
      quantity: 5,
      requestedById: 'user-1',
    });
  });

  it('should reject a procurement request', async () => {
    (repo.findOne as any).mockResolvedValue({
      id: 'req-2',
      status: ProcurementStatus.PENDING,
    });

    const result = await service.rejectRequest('req-2');
    expect(result.status).toBe(ProcurementStatus.REJECTED);
  });
});