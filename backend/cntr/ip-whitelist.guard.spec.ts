import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { IpWhitelistGuard } from './ip-whitelist.guard';

function makeContext(ip: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ ip }),
    }),
  } as unknown as ExecutionContext;
}

describe('IpWhitelistGuard', () => {
  const guard = new IpWhitelistGuard();
  const originalEnv = process.env.ADMIN_IP_WHITELIST;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.ADMIN_IP_WHITELIST;
    } else {
      process.env.ADMIN_IP_WHITELIST = originalEnv;
    }
  });

  it('allows matching IP when ADMIN_IP_WHITELIST is set', () => {
    process.env.ADMIN_IP_WHITELIST = '192.168.1.1, 10.0.0.1';
    expect(guard.canActivate(makeContext('192.168.1.1'))).toBe(true);
  });

  it('trims whitespace around IPs in the whitelist', () => {
    process.env.ADMIN_IP_WHITELIST = '  10.0.0.1  ,  192.168.1.1  ';
    expect(guard.canActivate(makeContext('10.0.0.1'))).toBe(true);
  });

  it('throws ForbiddenException for non-matching IP', () => {
    process.env.ADMIN_IP_WHITELIST = '10.0.0.1';
    expect(() => guard.canActivate(makeContext('1.2.3.4'))).toThrow(ForbiddenException);
  });

  it('allows all traffic when ADMIN_IP_WHITELIST is unset', () => {
    delete process.env.ADMIN_IP_WHITELIST;
    expect(guard.canActivate(makeContext('1.2.3.4'))).toBe(true);
  });

  it('allows all traffic when ADMIN_IP_WHITELIST is empty string', () => {
    process.env.ADMIN_IP_WHITELIST = '';
    expect(guard.canActivate(makeContext('9.9.9.9'))).toBe(true);
  });

  it('allows all traffic when ADMIN_IP_WHITELIST is only whitespace', () => {
    process.env.ADMIN_IP_WHITELIST = '   ';
    expect(guard.canActivate(makeContext('9.9.9.9'))).toBe(true);
  });
});
