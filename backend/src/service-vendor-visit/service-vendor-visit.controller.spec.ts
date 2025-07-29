import { Test, TestingModule } from '@nestjs/testing';
import { ServiceVendorVisitController } from './service-vendor-visit.controller';
import { ServiceVendorVisitService } from './service-vendor-visit.service';

describe('ServiceVendorVisitController', () => {
  let controller: ServiceVendorVisitController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceVendorVisitController],
      providers: [ServiceVendorVisitService],
    }).compile();

    controller = module.get<ServiceVendorVisitController>(ServiceVendorVisitController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
