import { ErrorSimulatorService } from './error-simulator.service';
import { ConfigService } from '../config/config.service';
describe('ErrorSimulatorService', () => {
  let service: ErrorSimulatorService;
  let configService: jest.Mocked<ConfigService>;
  beforeEach(() => {
    configService = { getConfig: jest.fn() } as any;
    service = new ErrorSimulatorService(configService);
  });
  it('should return null if random >= failureRate', () => {
    configService.getConfig.mockReturnValue({ deviceCount: 1, syncFrequency: 1, failureRate: 0 });
    jest.spyOn(Math, 'random').mockReturnValue(0.9);
    expect(service.simulateError()).toBeNull();
  });
  it('should return an error if random < failureRate', () => {
    configService.getConfig.mockReturnValue({ deviceCount: 1, syncFrequency: 1, failureRate: 1 });
    jest.spyOn(Math, 'random').mockReturnValue(0.1);
    const error = service.simulateError();
    expect(error).toHaveProperty('type');
    expect(error).toHaveProperty('message');
  });
}); 