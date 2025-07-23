import { BadgesService } from './badges.service';

describe('BadgesService', () => {
  let service: BadgesService;

  beforeEach(() => {
    service = new BadgesService();
  });

  it('should return all available badges', () => {
    const badges = service.getAllBadges();
    expect(badges.length).toBeGreaterThan(0);
    expect(badges[0].id).toBe('attendance-30');
  });

  it('should assign 30-day attendance badge to user1', () => {
    const badges = service.getUserBadges('user1');
    expect(badges.some(b => b.id === 'attendance-30')).toBe(true);
  });

  it('should not assign 30-day attendance badge to user2', () => {
    const badges = service.getUserBadges('user2');
    expect(badges.some(b => b.id === 'attendance-30')).toBe(false);
  });

  it('should return empty array for unknown user', () => {
    const badges = service.getUserBadges('unknown');
    expect(badges.length).toBe(0);
  });
}); 