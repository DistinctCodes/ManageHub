// guards/two-factor.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class TwoFactorGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    return req.user?.twoFactorVerified === true;
  }
}
