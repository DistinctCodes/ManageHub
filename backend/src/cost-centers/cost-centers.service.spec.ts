import { Test, TestingModule } from '@nestjs/testing';
import { CostCentersService } from './cost-centers.service';

describe('CostCentersService', () => {
  let service: CostCentersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CostCentersService],
    }).compile();

    service = module.get<CostCentersService>(CostCentersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
