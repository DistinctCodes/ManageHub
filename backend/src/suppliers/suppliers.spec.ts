import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersService } from './suppliers.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Supplier } from './suppliers.entity';
import { Repository } from 'typeorm';

const supplierArray = [
  { id: 1, name: 'Supplier1', email: 's1@email.com', contactInfo: '', address: '', phone: '', assets: [] },
  { id: 2, name: 'Supplier2', email: 's2@email.com', contactInfo: '', address: '', phone: '', assets: [] },
];

describe('SuppliersService', () => {
  let service: SuppliersService;
  let repo: Repository<Supplier>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersService,
        {
          provide: getRepositoryToken(Supplier),
          useValue: {
            find: jest.fn().mockResolvedValue(supplierArray),
            findOne: jest.fn().mockImplementation(({ where }) => supplierArray.find(s => s.id === where.id)),
            create: jest.fn().mockImplementation(dto => dto),
            save: jest.fn().mockImplementation(supplier => ({ ...supplier, id: 3 })),
            update: jest.fn(),
            delete: jest.fn(),
            remove: jest.fn(),
            manager: { getRepository: jest.fn() },
            createQueryBuilder: jest.fn().mockReturnValue({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getManyAndCount: jest.fn().mockResolvedValue([supplierArray, supplierArray.length]),
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
    repo = module.get<Repository<Supplier>>(getRepositoryToken(Supplier));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a supplier', async () => {
    const dto = { name: 'New', email: 'new@email.com' };
    expect(await service.create(dto as any)).toHaveProperty('id');
  });

  it('should find all suppliers', async () => {
    const result = await service.findAll({});
    expect(result.data.length).toBeGreaterThan(0);
  });

  it('should find one supplier', async () => {
    expect(await service.findOne(1)).toHaveProperty('id', 1);
  });

  it('should update a supplier', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValueOnce(supplierArray[0] as any);
    expect(await service.update(1, { name: 'Updated' } as any)).toHaveProperty('name', 'Updated');
  });

  it('should remove a supplier', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValueOnce(supplierArray[0] as any);
    await expect(service.remove(1)).resolves.toBeUndefined();
  });
});
