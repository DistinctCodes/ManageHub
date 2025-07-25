import { BiometricService } from './biometric.service';
describe('BiometricService', () => {
  let service: BiometricService;
  beforeEach(() => {
    service = new BiometricService();
  });
  it('should generate a dummy record', () => {
    const record = service.generateDummyRecord();
    expect(record).toHaveProperty('id');
    expect(record).toHaveProperty('deviceId');
    expect(['fingerprint', 'face', 'voice']).toContain(record.biometricType);
    expect(typeof record.dataQuality).toBe('number');
    expect(typeof record.payload).toBe('string');
    expect(record.generatedAt).toBeInstanceOf(Date);
  });
  it('should generate bulk records', () => {
    const records = service.generateBulkRecords(2, 3);
    expect(records.length).toBe(6);
  });
  it('should start and stop simulation', () => {
    service.startSimulation(1, 1);
    expect((service as any).simulationActive).toBe(true);
    service.stopSimulation();
    expect((service as any).simulationActive).toBe(false);
  });
  it('should create a record from DTO', () => {
    const dto = {
      deviceId: 'device-1',
      biometricType: 'face' as 'face',
      dataQuality: 90,
      payload: 'abc',
    };
    const record = service.create(dto);
    expect(record.deviceId).toBe('device-1');
    expect(record.biometricType).toBe('face');
    expect(record.dataQuality).toBe(90);
    expect(record.payload).toBe('abc');
  });
}); 