import { Test, TestingModule } from '@nestjs/testing';
import { InventoryMovementsController } from './inventory-movements.controller';

describe('InventoryMovementsController', () => {
  let controller: InventoryMovementsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryMovementsController],
    }).compile();

    controller = module.get<InventoryMovementsController>(InventoryMovementsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
