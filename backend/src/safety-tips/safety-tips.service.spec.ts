import { SafetyTipsService } from './safety-tips.service';

describe('SafetyTipsService', () => {
  let service: SafetyTipsService;

  beforeEach(() => {
    service = new SafetyTipsService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return a string tip for today', () => {
    const tip = service.getTodayTip();
    expect(typeof tip).toBe('string');
    expect(tip.length).toBeGreaterThan(0);
  });

  it('should rotate tips based on the day of the year', () => {
    // Simulate different days
    const tips = [];
    for (let i = 0; i < service["tips"].length; i++) {
      const fakeDate = new Date(2025, 0, i + 1);
      const start = new Date(fakeDate.getFullYear(), 0, 0);
      const diff = fakeDate.getTime() - start.getTime();
      const oneDay = 1000 * 60 * 60 * 24;
      const dayOfYear = Math.floor(diff / oneDay);
      const tip = service["tips"][dayOfYear % service["tips"].length];
      tips.push(tip);
    }
    // All tips should be unique in the rotation
    expect(new Set(tips).size).toBe(service["tips"].length);
  });

  it('should not throw if tips array is empty', () => {
    service["tips"] = [];
    expect(() => service.getTodayTip()).not.toThrow();
    expect(service.getTodayTip()).toBe('Stay safe!');
  });
});
