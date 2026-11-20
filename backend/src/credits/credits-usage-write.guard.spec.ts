import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtTokenVerifierService } from '../auth/jwt-token-verifier.service';
import { UserRole } from '../auth/enums/user-role.enum';
import { CreditsUsageWriteGuard } from './credits-usage-write.guard';

describe('CreditsUsageWriteGuard', () => {
  const configuredKey = 'credits-usage-write-test-key';
  let verifier: { verify: jest.Mock };
  let guard: CreditsUsageWriteGuard;

  function context(headers: Record<string, string>, cookies = {}) {
    const request = { headers, cookies };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      request,
    } as unknown as ExecutionContext & { request: typeof request };
  }

  beforeEach(() => {
    verifier = { verify: jest.fn() };
    guard = new CreditsUsageWriteGuard(
      { get: jest.fn().mockReturnValue(configuredKey) } as unknown as ConfigService,
      verifier as unknown as JwtTokenVerifierService,
    );
  });

  it('accepts the configured scoped key without a user JWT', async () => {
    const ctx = context({ 'x-service-key': configuredKey });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it('rejects an invalid service key without falling back to JWT auth', async () => {
    const ctx = context({
      'x-service-key': 'wrong',
      authorization: 'Bearer valid-admin-token',
    });

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it('continues to accept administrator JWTs', async () => {
    verifier.verify.mockResolvedValue({
      id: 'admin-1',
      role: UserRole.ADMIN,
    });
    const ctx = context({ authorization: 'Bearer valid-admin-token' });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(ctx.request.user).toEqual({ id: 'admin-1', role: UserRole.ADMIN });
  });

  it('does not accept a member JWT', async () => {
    verifier.verify.mockResolvedValue({
      id: 'member-1',
      role: UserRole.USER,
    });
    const ctx = context({ authorization: 'Bearer valid-member-token' });

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects missing credentials', async () => {
    await expect(guard.canActivate(context({}))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
