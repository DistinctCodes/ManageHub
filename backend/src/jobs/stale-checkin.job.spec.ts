import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { StaleCheckinJob } from './stale-checkin.job';
import { WorkspaceLog } from '../workspace-tracking/entities/workspace-log.entity';
import { NotificationsService } from '../notifications/notifications.service';

const mockLogsRepository = {
  find: jest.fn(),
  save: jest.fn(),
};

const mockNotificationsService = {
  create: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'CHECKIN_MAX_HOURS') return '12';
    return undefined;
  }),
};

describe('StaleCheckinJob', () => {
  let job: StaleCheckinJob;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaleCheckinJob,
        { provide: getRepositoryToken(WorkspaceLog), useValue: mockLogsRepository },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    job = module.get<StaleCheckinJob>(StaleCheckinJob);
  });

  it('should be defined', () => {
    expect(job).toBeDefined();
  });

  it('should do nothing when no stale check-ins exist', async () => {
    mockLogsRepository.find.mockResolvedValue([]);
    await job.closeStaleCheckIns();
    expect(mockLogsRepository.save).not.toHaveBeenCalled();
    expect(mockNotificationsService.create).not.toHaveBeenCalled();
  });

  it('should close stale check-ins and send notifications', async () => {
    const checkedInAt = new Date(Date.now() - 13 * 60 * 60 * 1000); // 13h ago
    const staleLog: Partial<WorkspaceLog> = {
      id: 'log-1',
      userId: 'user-1',
      workspaceId: 'ws-1',
      checkedInAt,
      checkedOutAt: null,
      durationMinutes: null,
      notes: null,
    };

    mockLogsRepository.find.mockResolvedValue([staleLog]);
    mockLogsRepository.save.mockResolvedValue({ ...staleLog, checkedOutAt: new Date() });
    mockNotificationsService.create.mockResolvedValue({});

    await job.closeStaleCheckIns();

    expect(mockLogsRepository.save).toHaveBeenCalledTimes(1);
    const savedLog = mockLogsRepository.save.mock.calls[0][0];
    expect(savedLog.checkedOutAt).toBeInstanceOf(Date);
    expect(savedLog.durationMinutes).toBeGreaterThan(0);
    expect(savedLog.notes).toContain('[auto-closed after 12h]');

    expect(mockNotificationsService.create).toHaveBeenCalledTimes(1);
    expect(mockNotificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        metadata: expect.objectContaining({ workspaceLogId: 'log-1' }),
      }),
    );
  });

  it('should use CHECKIN_MAX_HOURS from config', async () => {
    mockConfigService.get.mockImplementation((key: string) =>
      key === 'CHECKIN_MAX_HOURS' ? '6' : undefined,
    );
    mockLogsRepository.find.mockResolvedValue([]);
    await job.closeStaleCheckIns();
    // The find call should use a threshold 6h in the past (not 12h)
    const findCall = mockLogsRepository.find.mock.calls[0][0];
    const threshold: Date = findCall.where.checkedInAt.value;
    const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
    // threshold should be within 5 seconds of 6h ago
    expect(Math.abs(threshold.getTime() - sixHoursAgo)).toBeLessThan(5000);
  });
});