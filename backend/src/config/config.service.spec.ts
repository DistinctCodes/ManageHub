import { ConfigService } from './config.service';
describe('ConfigService', () => {
  let service: ConfigService;
  beforeEach(() => {
    service = new ConfigService();
  });
  it('should return default config', () => {
    expect(service.getConfig()).toEqual({ deviceCount: 5, syncFrequency: 1, failureRate: 0.2 });
  });
  it('should update config', () => {
    service.updateConfig({ deviceCount: 10, failureRate: 0.5 });
    expect(service.getConfig()).toEqual({ deviceCount: 10, syncFrequency: 1, failureRate: 0.5 });
  });
}); 