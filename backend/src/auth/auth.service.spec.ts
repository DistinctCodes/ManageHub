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

  it('logs in with a valid password', async () => {
    const bcrypt = await import('bcrypt');
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
    users.findOne.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@example.com',
      passwordHash: 'hashed:password123',
      role: UserRole.USER,
    });

    const result = await service.login({
      email: 'user@example.com',
      password: 'password123',
    });

    expect(result.accessToken).toBe('jwt:user-1:user');
  });

  it('rejects an invalid password', async () => {
    const bcrypt = await import('bcrypt');
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
    users.findOne.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@example.com',
      passwordHash: 'hashed:password123',
      role: UserRole.USER,
    });

    await expect(
      service.login({ email: 'user@example.com', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
