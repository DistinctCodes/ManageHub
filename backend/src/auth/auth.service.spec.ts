import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRole } from './enums/user-role.enum';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(async (value: string) => `hashed:${value}`),
}));

describe('AuthService', () => {
  const users = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((data) => ({ ...data })),
    save: jest.fn(async (entity) => ({
      id: 'user-1',
      role: UserRole.USER,
      ...entity,
    })),
    update: jest.fn(),
  };
  const jwtService = {
    signAsync: jest.fn(async (payload) => `jwt:${payload.sub}:${payload.role}`),
  };
  const service = new AuthService(users as any, jwtService as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers a user and issues a JWT', async () => {
    users.findOne.mockResolvedValueOnce(null);

    const result = await service.register({
      email: 'User@Example.com',
      password: 'password123',
    });

    expect(result.accessToken).toBe('jwt:user-1:user');
    expect(users.save).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
        passwordHash: 'hashed:password123',
      }),
    );
  });

  it('rejects duplicate registration', async () => {
    users.findOne.mockResolvedValueOnce({ id: 'user-1' });

    await expect(
      service.register({ email: 'user@example.com', password: 'password123' }),
    ).rejects.toThrow(ConflictException);
  });

  it('logs in with a valid password and stamps lastLoginAt before issuing a token', async () => {
    const bcrypt = await import('bcrypt');
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
    users.findOne.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@example.com',
      passwordHash: 'hashed:password123',
      role: UserRole.USER,
      lastLoginAt: null,
    });

    const result = await service.login({
      email: 'user@example.com',
      password: 'password123',
    });

    expect(result.accessToken).toBe('jwt:user-1:user');
    expect(users.update).toHaveBeenCalledWith('user-1', {
      lastLoginAt: expect.any(Date),
    });
  });

  it('rejects an unknown account without changing any row', async () => {
    users.findOne.mockResolvedValueOnce(null);

    await expect(
      service.login({ email: 'missing@example.com', password: 'password123' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(users.update).not.toHaveBeenCalled();
  });

  it('rejects an invalid password without changing the account', async () => {
    const bcrypt = await import('bcrypt');
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
    users.findOne.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@example.com',
      passwordHash: 'hashed:password123',
      role: UserRole.USER,
      lastLoginAt: null,
    });

    await expect(
      service.login({ email: 'user@example.com', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(users.update).not.toHaveBeenCalled();
  });

  it('fails the login when the successful-login stamp cannot be persisted', async () => {
    const bcrypt = await import('bcrypt');
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
    users.findOne.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@example.com',
      passwordHash: 'hashed:password123',
      role: UserRole.USER,
      lastLoginAt: null,
    });
    users.update.mockRejectedValueOnce(new Error('database unavailable'));

    await expect(
      service.login({ email: 'user@example.com', password: 'password123' }),
    ).rejects.toThrow('database unavailable');
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  describe('searchUsers (#2199)', () => {
    it('returns [] without querying when the query is empty or shorter than 2 characters', async () => {
      await expect(service.searchUsers('')).resolves.toEqual([]);
      await expect(service.searchUsers('a')).resolves.toEqual([]);
      await expect(service.searchUsers('%')).resolves.toEqual([]);
      await expect(service.searchUsers('_')).resolves.toEqual([]);
      expect(users.find).not.toHaveBeenCalled();
    });

    it('escapes %, _, and \\ wildcards and uses ESCAPE in the LIKE clause', async () => {
      users.find.mockResolvedValueOnce([
        { id: 'u-1', email: '100%_admin@example.com', role: UserRole.ADMIN },
      ]);

      const result = await service.searchUsers('100%_\\test');

      expect(result).toEqual([
        { id: 'u-1', email: '100%_admin@example.com', role: UserRole.ADMIN },
      ]);
      expect(users.find).toHaveBeenCalledTimes(1);
      const findArg = users.find.mock.calls[0][0];
      const rawOperator = findArg.where.email;
      expect(rawOperator._objectLiteralParameters).toEqual({
        search: '%100\%\_\\\\test%',
      });
    });
  });
});
