import { MonitoringService } from './monitoring.service';
import { Repository } from 'typeorm';
import { MonitoringLog } from './monitoring.entity';
import { CreateMonitoringDto } from './create-monitoring.dto';

function createTestMonitoringLog(
  overrides: Partial<MonitoringLog> = {},
): MonitoringLog {
  return {
    id: overrides.id ?? 1,
    userId: overrides.userId ?? 1,
    type: overrides.type ?? 'staff',
    action: overrides.action ?? 'check-in',
    timestamp: overrides.timestamp ?? new Date(),
    deviceUsed: overrides.deviceUsed ?? 'biometric',
    workspaceId: overrides.workspaceId ?? 100,
    ...overrides,
  };
}

class MockRepository {
  create = jest.fn();
  save = jest.fn();
  find = jest.fn();
}

describe('MonitoringService', () => {
  let service: MonitoringService;
  let repo: MockRepository;

  beforeEach(() => {
    repo = new MockRepository();
    service = new MonitoringService(
      repo as unknown as Repository<MonitoringLog>,
    );
  });

  it('should create a log', async () => {
    const dto: CreateMonitoringDto = {
      userId: 1,
      type: 'staff',
      action: 'check-in',
      deviceUsed: 'biometric',
      workspaceId: 100,
    };

    const createdLog = createTestMonitoringLog({
      userId: dto.userId,
      type: dto.type,
      action: dto.action,
      deviceUsed: dto.deviceUsed,
      workspaceId: dto.workspaceId,
    });

    repo.create.mockReturnValue(createdLog);
    repo.save.mockResolvedValue(createdLog);

    const result = await service.createLog(dto);

    expect(repo.create).toHaveBeenCalledWith(dto);
    expect(repo.save).toHaveBeenCalledWith(createdLog);
    expect(result).toEqual(createdLog);
  });

  it('should get logs by user', async () => {
    const userId = 1;
    const expectedLogs = [createTestMonitoringLog({ userId })];

    repo.find.mockResolvedValue(expectedLogs);

    const result = await service.getLogsByUser(userId);

    expect(repo.find).toHaveBeenCalledWith({ where: { userId } });
    expect(result).toEqual(expectedLogs);
  });

  it('should get logs by date range', async () => {
    const start = new Date('2024-01-01');
    const end = new Date('2024-01-31');
    const expectedLogs = [createTestMonitoringLog()];

    repo.find.mockResolvedValue(expectedLogs);

    const result = await service.getLogsByDateRange(start, end);

    expect(repo.find).toHaveBeenCalledWith({
      where: {
        timestamp: expect.any(Object),
      },
    });
    expect(result).toEqual(expectedLogs);
  });
});
