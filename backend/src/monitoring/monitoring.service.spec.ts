import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringService } from './monitoring.service';
import { DataSource } from 'typeorm';

const mockDataSource = {
  query: jest.fn(),
};

describe('MonitoringService', () => {
  let service: MonitoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringService,
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);
  });

  it('should return database up if query succeeds', async () => {
    mockDataSource.query.mockResolvedValueOnce([1]);
    const result = await service.getStatus();
    expect(result.database).toBe('up');
  });

  it('should return database down if query fails', async () => {
    mockDataSource.query.mockRejectedValueOnce(new Error('fail'));
    const result = await service.getStatus();
    expect(result.database).toBe('down');
  });
});
