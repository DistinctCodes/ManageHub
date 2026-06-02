import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class IpWhitelistGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ ip: string }>();
    const raw = process.env.ADMIN_IP_WHITELIST ?? '';
    if (!raw.trim()) return true;
    const allowed = raw
      .split(',')
      .map((ip) => ip.trim())
      .filter(Boolean);
    if (allowed.length === 0) return true;
    if (allowed.includes(request.ip)) return true;
    throw new ForbiddenException('IP not whitelisted');
  }
}
