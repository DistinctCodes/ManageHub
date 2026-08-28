import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../enums/user-role.enum';

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };
  const guard = new RolesGuard(reflector as unknown as Reflector);

  const handler = () => undefined;
  const controllerClass = class TestController {};

  const createContext = (user?: {
    id: string;
    role: UserRole;
  }): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => controllerClass,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows the request through when no @Roles() metadata is present', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(
      guard.canActivate(createContext({ id: 'u1', role: UserRole.USER })),
    ).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      handler,
      controllerClass,
    ]);
  });

  it('allows the request through when @Roles() is present but empty', () => {
    reflector.getAllAndOverride.mockReturnValue([]);

    expect(
      guard.canActivate(createContext({ id: 'u1', role: UserRole.USER })),
    ).toBe(true);
  });

  it('grants access to a user that has the required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(
      guard.canActivate(createContext({ id: 'u1', role: UserRole.ADMIN })),
    ).toBe(true);
  });

  it('grants access when the user holds one of several accepted roles', () => {
    reflector.getAllAndOverride.mockReturnValue([
      UserRole.ADMIN,
      UserRole.USER,
    ]);

    expect(
      guard.canActivate(createContext({ id: 'u1', role: UserRole.USER })),
    ).toBe(true);
  });

  it('denies access to a user that lacks the required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(
      guard.canActivate(createContext({ id: 'u1', role: UserRole.USER })),
    ).toBe(false);
  });

  it('denies access when the request has no authenticated user', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.USER]);

    expect(guard.canActivate(createContext(undefined))).toBe(false);
  });
});
