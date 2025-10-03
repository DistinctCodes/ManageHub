import { Test, TestingModule } from '@nestjs/testing';
import { InventoryMovementsService } from './inventory-movements.service';

describe('InventoryMovementsService', () => {
  let service: InventoryMovementsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InventoryMovementsService],
    }).compile();

    service = module.get<InventoryMovementsService>(InventoryMovementsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
