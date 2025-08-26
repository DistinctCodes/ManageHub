import { Test, TestingModule } from '@nestjs/testing';
import { WorkSpacePreferenceService } from './work-space-preference.service';

describe('WorkSpacePreferenceService', () => {
  let service: WorkSpacePreferenceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkSpacePreferenceService],
    }).compile();

    service = module.get<WorkSpacePreferenceService>(WorkSpacePreferenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
