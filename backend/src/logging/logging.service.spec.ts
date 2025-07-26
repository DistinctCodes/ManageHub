import { LoggingService } from './logging.service';
describe('LoggingService', () => {
  let service: LoggingService;
  beforeEach(() => {
    service = new LoggingService();
  });
  it('should log sync results', async () => {
    await service.logSyncResult('dev-1', new Date(), 'success', undefined, 1);
    const logs = await service.getLogs({});
    expect(logs.data.length).toBe(1);
    expect(logs.data[0].status).toBe('success');
  });
  it('should filter logs by deviceId and status', async () => {
    await service.logSyncResult('dev-1', new Date(), 'success', undefined, 1);
    await service.logSyncResult('dev-2', new Date(), 'failure', 'timeout', 2);
    const logs = await service.getLogs({ deviceId: 'dev-2', status: 'failure' });
    expect(logs.data.length).toBe(1);
    expect(logs.data[0].deviceId).toBe('dev-2');
    expect(logs.data[0].status).toBe('failure');
  });
  it('should paginate logs', async () => {
    for (let i = 0; i < 30; i++) {
      await service.logSyncResult('dev-1', new Date(), 'success', undefined, 1);
    }
    const logs = await service.getLogs({ page: 2, limit: 10 });
    expect(logs.data.length).toBe(10);
  });
}); 