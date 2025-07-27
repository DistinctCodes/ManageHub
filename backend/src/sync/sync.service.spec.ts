import { SyncService } from './sync.service';
import { ErrorSimulatorService } from '../errors/error-simulator.service';
import { LoggingService } from '../logging/logging.service';
import { BiometricDataEntity } from '../biometric/biometric.entity';

describe('SyncService', () => {
  let service: SyncService;
  let errorSimulator: jest.Mocked<ErrorSimulatorService>;
  let loggingService: jest.Mocked<LoggingService>;
  const dummyData: BiometricDataEntity = {
    id: '1',
    deviceId: 'dev-1',
    biometricType: 'face',
    dataQuality: 80,
    payload: 'abc',
    generatedAt: new Date(),
  };
  beforeEach(() => {
    errorSimulator = { simulateError: jest.fn() } as any;
    loggingService = { logSyncResult: jest.fn() } as any;
    service = new SyncService(errorSimulator, loggingService);
  });
  it('should sync successfully if no error', async () => {
    errorSimulator.simulateError.mockReturnValue(null);
    await service.syncData(dummyData);
    expect(loggingService.logSyncResult).toHaveBeenCalledWith(
      dummyData.deviceId,
      expect.any(Date),
      'success',
      undefined,
      1
    );
  });
  it('should retry on error and log failures', async () => {
    errorSimulator.simulateError
      .mockReturnValueOnce({ type: 'timeout', message: 'fail' })
      .mockReturnValueOnce(null);
    await service.syncData(dummyData);
    expect(loggingService.logSyncResult).toHaveBeenCalledWith(
      dummyData.deviceId,
      expect.any(Date),
      'failure',
      'timeout',
      1
    );
    expect(loggingService.logSyncResult).toHaveBeenCalledWith(
      dummyData.deviceId,
      expect.any(Date),
      'success',
      undefined,
      2
    );
  });
}); 