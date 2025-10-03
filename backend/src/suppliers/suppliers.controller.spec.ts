import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';

const supplier = { id: 1, name: 'Supplier1', email: 's1@email.com', isActive: true, assets: [] };

describe('SuppliersController', () => {
  let controller: SuppliersController;
  let service: SuppliersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuppliersController],
      providers: [
        {
          provide: SuppliersService,
          useValue: {
            create: jest.fn().mockResolvedValue(supplier),
            findAll: jest.fn().mockResolvedValue({ data: [supplier], total: 1 }),
            findOne: jest.fn().mockResolvedValue(supplier),
            update: jest.fn().mockResolvedValue({ ...supplier, name: 'Updated' }),
            remove: jest.fn().mockResolvedValue(undefined),
            assignAsset: jest.fn().mockResolvedValue(supplier),
            unassignAsset: jest.fn().mockResolvedValue(supplier),
            toggleStatus: jest.fn().mockResolvedValue({ ...supplier, isActive: false }),
          },
        },
      ],
    }).compile();

    controller = module.get<SuppliersController>(SuppliersController);
    service = module.get<SuppliersService>(SuppliersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a supplier', async () => {
    expect(await controller.create({ name: 'Supplier1', email: 's1@email.com' })).toEqual(supplier);
  });

  it('should get all suppliers', async () => {
    expect(await controller.findAll({})).toEqual({ data: [supplier], total: 1 });
  });

  it('should get one supplier', async () => {
    expect(await controller.findOne('1')).toEqual(supplier);
  });

  it('should update a supplier', async () => {
    expect(await controller.update('1', { name: 'Updated' })).toHaveProperty('name', 'Updated');
  });

  it('should remove a supplier', async () => {
    await expect(controller.remove('1')).resolves.toBeUndefined();
  });

  it('should assign asset', async () => {
    expect(await controller.assignAsset({ supplierId: 1, assetId: 2 })).toEqual(supplier);
  });

  it('should unassign asset', async () => {
    expect(await controller.unassignAsset({ supplierId: 1, assetId: 2 })).toEqual(supplier);
  });

  it('should toggle status', async () => {
    expect(await controller.toggleStatus('1')).toHaveProperty('isActive', false);
  });
});
