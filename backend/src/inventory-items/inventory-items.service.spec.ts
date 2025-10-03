import { Test, TestingModule } from '@nestjs/testing';
import { InventoryItemsService } from './inventory-items.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InventoryItem } from './inventory-items.entity';
import { StockMovement } from './stock-movement.entity';
import { Repository } from 'typeorm';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';

describe('InventoryItemsService', () => {
  let service: InventoryItemsService;
  let inventoryItemsRepository: Repository<InventoryItem>;
  let stockMovementRepository: Repository<StockMovement>;

  const mockInventoryItem = {
    id: 1,
    name: 'Test Item',
    quantity: 10,
    reorderLevel: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
    stockMovements: [],
  };

  const mockInventoryItemsRepository = {
    create: jest.fn().mockReturnValue(mockInventoryItem),
    save: jest.fn().mockResolvedValue(mockInventoryItem),
    find: jest.fn().mockResolvedValue([mockInventoryItem]),
    findOne: jest.fn().mockResolvedValue(mockInventoryItem),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  const mockStockMovementRepository = {
    save: jest.fn().mockResolvedValue({}),
    find: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryItemsService,
        {
          provide: getRepositoryToken(InventoryItem),
          useValue: mockInventoryItemsRepository,
        },
        {
          provide: getRepositoryToken(StockMovement),
          useValue: mockStockMovementRepository,
        },
      ],
    }).compile();

    service = module.get<InventoryItemsService>(InventoryItemsService);
    inventoryItemsRepository = module.get<Repository<InventoryItem>>(
      getRepositoryToken(InventoryItem),
    );
    stockMovementRepository = module.get<Repository<StockMovement>>(
      getRepositoryToken(StockMovement),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an inventory item', async () => {
      const createDto: CreateInventoryItemDto = {
        name: 'Test Item',
        quantity: 10,
        reorderLevel: 5,
      };

      const result = await service.create(createDto);

      expect(result).toEqual(mockInventoryItem);
      expect(inventoryItemsRepository.create).toHaveBeenCalledWith(createDto);
      expect(inventoryItemsRepository.save).toHaveBeenCalledWith(mockInventoryItem);
    });
  });

  describe('findAll', () => {
    it('should return an array of inventory items', async () => {
      const result = await service.findAll();

      expect(result).toEqual([mockInventoryItem]);
      expect(inventoryItemsRepository.find).toHaveBeenCalledWith({
        relations: ['stockMovements'],
      });
    });
  });
});