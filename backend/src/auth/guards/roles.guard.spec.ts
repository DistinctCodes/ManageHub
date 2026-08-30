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

  /**
   * Issue #1703: distinguishes "none of several" from "one of several".
   * `UserRole` currently defines exactly two values (USER, ADMIN), so a
   * requiredRoles list naming *every* real role is always satisfied by any
   * authenticated user — there is no legitimate role value a real user can
   * hold that misses a two-or-more-role allowlist covering the whole enum.
   * The only way to exercise "held none of several" is a role value outside
   * the enum entirely (stale JWT from before a role was renamed/removed,
   * bad seed data, a migration artifact) — which is exactly the case this
   * guard must not silently let through.
   */
  it('denies access when the user holds none of several accepted roles', () => {
    reflector.getAllAndOverride.mockReturnValue([
      UserRole.ADMIN,
      UserRole.USER,
    ]);

    expect(
      guard.canActivate(
        createContext({ id: 'u1', role: 'legacy-moderator' as UserRole }),
      ),
    ).toBe(false);
  });

  /**
   * "A user holding more than one required role at once" is not
   * representable today: `RequestUser.role` (authenticated-request.interface.ts)
   * is a single `UserRole`, not `UserRole[]`, and this guard's check
   * (`requiredRoles.includes(request.user?.role)`) only ever tests that one
   * value. Multi-role-per-user is explicitly unsupported rather than
   * ambiguous — introducing it would require widening `RequestUser.role`
   * itself, not a change to this guard.
   */

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
