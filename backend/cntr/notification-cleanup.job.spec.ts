import { identifyExpiredNotifications, Notification } from './notification-cleanup.job';

const now = new Date('2026-06-02T12:00:00Z');

const notification = (overrides: Partial<Notification> = {}): Notification => ({
  id: 'n-1',
  isRead: true,
  createdAt: new Date('2026-04-01T00:00:00Z'),
  ...overrides,
});

describe('identifyExpiredNotifications', () => {
  it('returns read notifications older than retentionDays', () => {
    const old = notification({ createdAt: new Date('2026-04-01T00:00:00Z') });
    expect(identifyExpiredNotifications([old], 30, now)).toContain(old);
  });

  it('does not return read notifications younger than retentionDays', () => {
    const recent = notification({ createdAt: new Date('2026-05-25T00:00:00Z') });
    expect(identifyExpiredNotifications([recent], 30, now)).not.toContain(recent);
  });

  it('never returns unread notifications regardless of age', () => {
    const old = notification({ isRead: false, createdAt: new Date('2020-01-01T00:00:00Z') });
    expect(identifyExpiredNotifications([old], 30, now)).not.toContain(old);
  });

  it('does not return notification exactly at retentionDays (strict greater)', () => {
    const exactly = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const n = notification({ createdAt: exactly });
    expect(identifyExpiredNotifications([n], 30, now)).not.toContain(n);
  });

  it('returns notification 1ms over retentionDays', () => {
    const justOver = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000 - 1);
    const n = notification({ createdAt: justOver });
    expect(identifyExpiredNotifications([n], 30, now)).toContain(n);
  });

  it('respects custom retentionDays', () => {
    const n = notification({ createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) });
    expect(identifyExpiredNotifications([n], 5, now)).toContain(n);
    expect(identifyExpiredNotifications([n], 15, now)).not.toContain(n);
  });

  it('accepts optional now parameter for testability', () => {
    const customNow = new Date('2030-01-01T00:00:00Z');
    const n = notification({ createdAt: new Date('2026-01-01T00:00:00Z') });
    expect(identifyExpiredNotifications([n], 30, customNow)).toContain(n);
  });
});
