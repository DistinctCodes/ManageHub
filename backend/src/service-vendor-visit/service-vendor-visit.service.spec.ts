import { Test, TestingModule } from '@nestjs/testing';
import { ServiceVendorVisitService } from './service-vendor-visit.service';

describe('ServiceVendorVisitService', () => {
  let service: ServiceVendorVisitService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServiceVendorVisitService],
    }).compile();

    service = module.get<ServiceVendorVisitService>(ServiceVendorVisitService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
