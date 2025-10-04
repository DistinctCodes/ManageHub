import { Test, TestingModule } from '@nestjs/testing';
import { InventoryItemsController } from './inventory-items.controller';
import { InventoryItemsService } from './inventory-items.service';

describe('InventoryItemsController', () => {
  let controller: InventoryItemsController;
  let service: InventoryItemsService;

  const mockInventoryItem = {
    id: 1,
    name: 'Test Item',
    quantity: 10,
    reorderLevel: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
    stockMovements: [],
  };

  const mockService = {
    create: jest.fn().mockResolvedValue(mockInventoryItem),
    findAll: jest.fn().mockResolvedValue([mockInventoryItem]),
    findOne: jest.fn().mockResolvedValue(mockInventoryItem),
    update: jest.fn().mockResolvedValue(mockInventoryItem),
    remove: jest.fn().mockResolvedValue(undefined),
    updateStock: jest.fn().mockResolvedValue(mockInventoryItem),
    addStock: jest.fn().mockResolvedValue(mockInventoryItem),
    removeStock: jest.fn().mockResolvedValue(mockInventoryItem),
    checkReorderLevel: jest.fn().mockResolvedValue(true),
    getStockMovements: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryItemsController],
      providers: [
        {
          provide: InventoryItemsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<InventoryItemsController>(InventoryItemsController);
    service = module.get<InventoryItemsService>(InventoryItemsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an inventory item', async () => {
      const createDto = {
        name: 'Test Item',
        quantity: 10,
        reorderLevel: 5,
      };

      const result = await controller.create(createDto);

      expect(result).toEqual(mockInventoryItem);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of inventory items', async () => {
      const result = await controller.findAll();

      expect(result).toEqual([mockInventoryItem]);
      expect(service.findAll).toHaveBeenCalled();
    });
  });
});