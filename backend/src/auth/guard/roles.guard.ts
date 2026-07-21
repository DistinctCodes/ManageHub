import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/enums/userRoles.enum';
import { ROLES_KEY } from '../decorators/roles.decorators';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 4,
  [UserRole.ADMIN]: 3,
  [UserRole.STAFF]: 2,
  [UserRole.USER]: 1,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: { role?: UserRole } }>();
    const { user } = request;

    if (!user) {
      throw new ForbiddenException('user not authenticated');
    }

    const userLevel = ROLE_HIERARCHY[user.role as UserRole] ?? 0;
    const hasRequiredRole = requiredRoles.some(
      (role) => userLevel >= ROLE_HIERARCHY[role],
    );

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }
    return true;
  }
}
