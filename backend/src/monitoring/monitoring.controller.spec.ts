import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { CreateMonitoringDto } from './create-monitoring.dto';
import { MonitoringLog } from './monitoring.entity';

describe('MonitoringController', () => {
  let controller: MonitoringController;
  let service: MonitoringService;

  const mockService = {
    createLog: jest.fn(),
    getLogsByUser: jest.fn(),
    getLogsByDateRange: jest.fn(),
  };

  beforeEach(() => {
    service = mockService as unknown as MonitoringService;
    controller = new MonitoringController(service);
  });

  it('should handle POST create', async () => {
    const dto: CreateMonitoringDto = {
      userId: 1,
      type: 'staff',
      action: 'check-in',
      deviceUsed: 'biometric',
      workspaceId: 100,
    };

    const expectedResult: MonitoringLog = {
      id: 1,
      ...dto,
      timestamp: new Date(),
    };

    mockService.createLog.mockResolvedValue(expectedResult);

    const result = await controller.create(dto);

    expect(mockService.createLog).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expectedResult);
  });

  it('should handle GET by user', async () => {
    const userId = 1;
    const expectedLogs = [
      {
        id: 1,
        userId,
        type: 'staff',
        action: 'check-in',
        timestamp: new Date(),
        deviceUsed: 'biometric',
        workspaceId: 100,
      },
    ];

    mockService.getLogsByUser.mockResolvedValue(expectedLogs);

    const result = await controller.getByUser(userId);

    expect(mockService.getLogsByUser).toHaveBeenCalledWith(userId);
    expect(result).toEqual(expectedLogs);
  });

  it('should handle GET by date range', async () => {
    const start = new Date();
    const end = new Date();
    const expectedLogs = [
      {
        id: 1,
        userId: 1,
        type: 'staff',
        action: 'check-in',
        timestamp: new Date(),
        deviceUsed: 'biometric',
        workspaceId: 100,
      },
    ];

    mockService.getLogsByDateRange.mockResolvedValue(expectedLogs);

    const result = await controller.getByDate(
      start.toISOString(),
      end.toISOString(),
    );

    expect(mockService.getLogsByDateRange).toHaveBeenCalledWith(
      new Date(start.toISOString()),
      new Date(end.toISOString()),
    );
    expect(result).toEqual(expectedLogs);
  });
});
