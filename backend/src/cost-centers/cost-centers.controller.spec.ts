import { Test, TestingModule } from '@nestjs/testing';
import { CostCentersController } from './cost-centers.controller';
import { CostCentersService } from './cost-centers.service';

describe('CostCentersController', () => {
  let controller: CostCentersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CostCentersController],
      providers: [CostCentersService],
    }).compile();

    controller = module.get<CostCentersController>(CostCentersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
