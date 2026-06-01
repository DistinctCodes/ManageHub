import { TokenBlacklist } from './token-blacklist.util';

describe('TokenBlacklist', () => {
  let blacklist: TokenBlacklist;

  beforeEach(() => {
    blacklist = new TokenBlacklist();
  });

  const future = (offsetMs: number) => new Date(Date.now() + offsetMs);
  const past = (offsetMs: number) => new Date(Date.now() - offsetMs);

  it('returns false for an unknown JTI', () => {
    expect(blacklist.isBlacklisted('unknown-jti')).toBe(false);
  });

  it('returns true for a blacklisted token that has not yet expired', () => {
    blacklist.blacklist('jti-1', future(60_000));
    expect(blacklist.isBlacklisted('jti-1')).toBe(true);
  });

  it('returns false for a blacklisted token whose expiresAt has passed', () => {
    blacklist.blacklist('jti-2', past(1_000));
    expect(blacklist.isBlacklisted('jti-2')).toBe(false);
  });

  it('purgeExpired removes entries whose expiresAt is before now', () => {
    const now = new Date();
    blacklist.blacklist('expired', new Date(now.getTime() - 1_000));
    blacklist.blacklist('valid', new Date(now.getTime() + 60_000));

    blacklist.purgeExpired(now);

    expect(blacklist.isBlacklisted('expired')).toBe(false);
    expect(blacklist.isBlacklisted('valid')).toBe(true);
  });

  it('purgeExpired accepts an optional now parameter for testability', () => {
    const fixedNow = new Date('2030-01-01T00:00:00Z');
    blacklist.blacklist('jti-old', new Date('2029-12-31T23:59:59Z'));
    blacklist.blacklist('jti-future', new Date('2030-01-02T00:00:00Z'));

    blacklist.purgeExpired(fixedNow);

    expect(blacklist.isBlacklisted('jti-old')).toBe(false);
  });

  it('purgeExpired leaves valid entries intact', () => {
    blacklist.blacklist('jti-live', future(60_000));
    blacklist.purgeExpired();
    expect(blacklist.isBlacklisted('jti-live')).toBe(true);
  });
});
