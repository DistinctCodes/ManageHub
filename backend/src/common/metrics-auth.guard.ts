import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';

/**
 * Restricts the Prometheus scrape endpoint (issue #1781). Previously
 * MetricsController served request volumes and error rates by route with
 * no access control at all, relying entirely on the operator to restrict
 * it at the network level.
 *
 * Requires an `Authorization: Bearer <METRICS_ACCESS_TOKEN>` header
 * matching the METRICS_ACCESS_TOKEN env var (the standard shape for a
 * Prometheus `bearer_token` scrape config). Network-level restriction
 * (e.g. only allowing the endpoint from an internal subnet) remains a
 * valid, complementary option — this guard covers the case where that
 * alone isn't in place.
 *
 * With no token configured: refuses every request outside development,
 * since shipping to staging/prod without ever setting the token should
 * fail closed rather than silently stay world-readable. In development
 * it allows the request through (logging a one-time warning) so local
 * `curl localhost:PORT/metrics` keeps working without extra setup.
 */
@Injectable()
export class MetricsAuthGuard implements CanActivate {
  private readonly logger = new Logger(MetricsAuthGuard.name);
  private warnedNoTokenConfigured = false;

  canActivate(context: ExecutionContext): boolean {
    const configuredToken = process.env.METRICS_ACCESS_TOKEN;

    if (!configuredToken) {
      if (process.env.NODE_ENV === 'production') {
        throw new UnauthorizedException(
          'Metrics endpoint is not configured for access (METRICS_ACCESS_TOKEN unset)',
        );
      }
      if (!this.warnedNoTokenConfigured) {
        this.warnedNoTokenConfigured = true;
        this.logger.warn(
          'METRICS_ACCESS_TOKEN is not set — /metrics is unauthenticated. ' +
            'Set it before deploying outside local development.',
        );
      }
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const presentedToken = this.extractToken(request);

    if (!presentedToken || !this.matches(presentedToken, configuredToken)) {
      throw new UnauthorizedException('Invalid or missing metrics token');
    }

    return true;
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  /** Constant-time comparison so a wrong-length/wrong-value guess can't be
   * timed to narrow down the correct token byte by byte. */
  private matches(presented: string, configured: string): boolean {
    const presentedBuf = Buffer.from(presented);
    const configuredBuf = Buffer.from(configured);
    if (presentedBuf.length !== configuredBuf.length) {
      return false;
    }
    return timingSafeEqual(presentedBuf, configuredBuf);
  }
}
