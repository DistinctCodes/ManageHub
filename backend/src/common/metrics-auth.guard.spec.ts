import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { MetricsAuthGuard } from './metrics-auth.guard';

describe('MetricsAuthGuard (issue #1781)', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  function buildContext(authorizationHeader?: string): ExecutionContext {
    const request = {
      headers: authorizationHeader
        ? { authorization: authorizationHeader }
        : {},
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('allows a request bearing the correct token', () => {
    process.env.METRICS_ACCESS_TOKEN = 'correct-horse-battery-staple';
    const guard = new MetricsAuthGuard();

    expect(
      guard.canActivate(buildContext('Bearer correct-horse-battery-staple')),
    ).toBe(true);
  });

  it('rejects a request with the wrong token', () => {
    process.env.METRICS_ACCESS_TOKEN = 'correct-horse-battery-staple';
    const guard = new MetricsAuthGuard();

    expect(() => guard.canActivate(buildContext('Bearer wrong-token'))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a request with no Authorization header at all', () => {
    process.env.METRICS_ACCESS_TOKEN = 'correct-horse-battery-staple';
    const guard = new MetricsAuthGuard();

    expect(() => guard.canActivate(buildContext())).toThrow(
      UnauthorizedException,
    );
  });

  it('refuses every request in production when no token is configured', () => {
    delete process.env.METRICS_ACCESS_TOKEN;
    process.env.NODE_ENV = 'production';
    const guard = new MetricsAuthGuard();

    expect(() => guard.canActivate(buildContext())).toThrow(
      UnauthorizedException,
    );
  });

  it('allows requests through in development when no token is configured', () => {
    delete process.env.METRICS_ACCESS_TOKEN;
    process.env.NODE_ENV = 'development';
    const guard = new MetricsAuthGuard();

    expect(guard.canActivate(buildContext())).toBe(true);
  });
});
