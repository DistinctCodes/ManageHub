import { Test, TestingModule } from '@nestjs/testing';
import { WorkSpacePreferenceController } from './work-space-preference.controller';
import { WorkSpacePreferenceService } from './work-space-preference.service';

describe('WorkSpacePreferenceController', () => {
  let controller: WorkSpacePreferenceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkSpacePreferenceController],
      providers: [WorkSpacePreferenceService],
    }).compile();

    controller = module.get<WorkSpacePreferenceController>(WorkSpacePreferenceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
