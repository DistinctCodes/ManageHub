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

  it(
    'logs in with a valid password and stamps lastLoginAt before issuing a token',
    async () => {
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
    },
  );

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

  it(
    'fails the login when the successful-login stamp cannot be persisted',
    async () => {
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
    },
  );
});
