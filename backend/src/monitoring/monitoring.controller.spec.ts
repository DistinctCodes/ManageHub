import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';

describe('MonitoringController', () => {
  let controller: MonitoringController;
  let service: MonitoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonitoringController],
      providers: [
        {
          provide: MonitoringService,
          useValue: {
            getStatus: jest.fn().mockResolvedValue({ database: 'up' }),
          },
        },
      ],
    }).compile();

    controller = module.get<MonitoringController>(MonitoringController);
    service = module.get<MonitoringService>(MonitoringService);
  });

  it('should return status from service', async () => {
    const result = await controller.getStatus();
    expect(result).toEqual({ database: 'up' });
  });
});
