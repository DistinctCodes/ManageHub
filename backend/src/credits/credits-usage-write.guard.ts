import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { JwtTokenVerifierService } from '../auth/jwt-token-verifier.service';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { UserRole } from '../auth/enums/user-role.enum';

@Injectable()
export class CreditsUsageWriteGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly verifier: JwtTokenVerifierService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const serviceKey = request.headers['x-service-key'];
    const configuredKey = this.config.get<string>('CREDITS_USAGE_API_KEY');

    if (serviceKey !== undefined) {
      if (
        typeof serviceKey !== 'string' ||
        !configuredKey ||
        !this.matchesKey(serviceKey, configuredKey)
      ) {
        throw new UnauthorizedException('Invalid service credential');
      }
      return true;
    }

    const token =
      request.cookies?.accessToken ??
      this.extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Missing service credential or admin token');
    }

    try {
      request.user = await this.verifier.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (request.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin role required');
    }
    return true;
  }

  private extractBearerToken(authorization?: string): string | undefined {
    const [type, token] = authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private matchesKey(candidate: string, expected: string): boolean {
    const candidateBytes = Buffer.from(candidate);
    const expectedBytes = Buffer.from(expected);
    return (
      candidateBytes.length === expectedBytes.length &&
      timingSafeEqual(candidateBytes, expectedBytes)
    );
  }
}
