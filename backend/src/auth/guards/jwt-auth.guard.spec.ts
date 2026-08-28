import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UserRole } from '../enums/user-role.enum';

class TokenExpiredError extends Error {
  constructor() {
    super('jwt expired');
    this.name = 'TokenExpiredError';
  }
}

class JsonWebTokenError extends Error {
  constructor(message = 'invalid signature') {
    super(message);
    this.name = 'JsonWebTokenError';
  }
}

describe('JwtAuthGuard', () => {
  const verifier = {
    verify: jest.fn(),
  };
  const guard = new JwtAuthGuard(verifier as any);

  const createContext = (request: Record<string, any>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a request with no authorization header or cookie', async () => {
    const context = createContext({ headers: {}, cookies: {} });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Missing bearer token'),
    );
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it('rejects a malformed authorization header without the Bearer scheme', async () => {
    const context = createContext({
      headers: { authorization: 'Token abc.def.ghi' },
      cookies: {},
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Missing bearer token'),
    );
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it('rejects a Bearer header that carries no token value', async () => {
    const context = createContext({
      headers: { authorization: 'Bearer' },
      cookies: {},
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Missing bearer token'),
    );
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it('rejects an expired token', async () => {
    verifier.verify.mockRejectedValueOnce(new TokenExpiredError());
    const context = createContext({
      headers: { authorization: 'Bearer expired.token' },
      cookies: {},
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Invalid or expired token'),
    );
    expect(verifier.verify).toHaveBeenCalledWith('expired.token');
  });

  it('rejects a token with an invalid signature', async () => {
    verifier.verify.mockRejectedValueOnce(new JsonWebTokenError());
    const context = createContext({
      headers: { authorization: 'Bearer tampered.token' },
      cookies: {},
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Invalid or expired token'),
    );
    expect(verifier.verify).toHaveBeenCalledWith('tampered.token');
  });

  it('accepts a valid token and attaches the user to the request', async () => {
    const user = { id: 'user-1', role: UserRole.ADMIN };
    verifier.verify.mockResolvedValueOnce(user);
    const request: Record<string, any> = {
      headers: { authorization: 'Bearer valid.token' },
      cookies: {},
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(verifier.verify).toHaveBeenCalledWith('valid.token');
    expect(request.user).toBe(user);
  });

  it('reads the token from the accessToken cookie when present', async () => {
    const user = { id: 'user-2', role: UserRole.USER };
    verifier.verify.mockResolvedValueOnce(user);
    const request: Record<string, any> = {
      headers: {},
      cookies: { accessToken: 'cookie.token' },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(verifier.verify).toHaveBeenCalledWith('cookie.token');
    expect(request.user).toBe(user);
  });

  it('prefers the cookie token over the authorization header', async () => {
    verifier.verify.mockResolvedValueOnce({
      id: 'user-3',
      role: UserRole.USER,
    });
    const request: Record<string, any> = {
      headers: { authorization: 'Bearer header.token' },
      cookies: { accessToken: 'cookie.token' },
    };

    await guard.canActivate(createContext(request));
    expect(verifier.verify).toHaveBeenCalledWith('cookie.token');
  });
});
