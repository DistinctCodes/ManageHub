import { Test, TestingModule } from '@nestjs/testing';
import { ScheduledJobsService } from './scheduled-jobs.service';

describe('ScheduledJobsService', () => {
  let service: ScheduledJobsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScheduledJobsService],
    }).compile();

    service = module.get<ScheduledJobsService>(ScheduledJobsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
