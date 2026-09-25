import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import type {
  HealthCheckResult,
  HealthIndicatorResult,
} from '@nestjs/terminus';

const DEFAULT_HEALTH_CHECK_TIMEOUT_MS = 3_000;
const MAX_HEALTH_CHECK_TIMEOUT_MS = 30_000;

/** A dependency-free indicator used to answer the process liveness probe. */
class ServiceLivenessIndicator extends HealthIndicator {
  check(): HealthIndicatorResult {
    return this.getStatus('service', true);
  }
}

/**
 * Health probes for container orchestrators.
 *
 * `GET /health` is a liveness probe: it only verifies that the Nest process
 * can execute a health indicator and must not inspect the database. A
 * database blip must not make an orchestrator kill an otherwise healthy pod.
 * `GET /health/ready` is the readiness probe: it performs a real TypeORM
 * `SELECT 1` ping and Terminus turns an unreachable database into HTTP 503.
 *
 * JwtAuthGuard is intentionally absent so probes, curl, and other
 * unauthenticated health checkers can call these routes. The global
 * ThrottlerGuard (APP_GUARD) still applies, which is desirable for a public
 * endpoint.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly livenessIndicator = new ServiceLivenessIndicator();

  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly typeOrmHealthIndicator: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Confirms the Nest process is alive without checking external dependencies.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The process is alive.',
  })
  async liveness() {
    const result = await this.healthCheckService.check([
      () => this.livenessIndicator.check(),
    ]);

    return {
      ...result,
      service: 'managehub-backend',
      uptimeSeconds: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Checks the primary TypeORM connection and reports unavailable dependencies as 503.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The service is ready to receive traffic.',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'The database is unreachable or the readiness check timed out.',
  })
  readiness(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([
      () =>
        this.typeOrmHealthIndicator.pingCheck('database', {
          timeout: this.healthCheckTimeoutMs(),
        }),
    ]);
  }

  private healthCheckTimeoutMs(): number {
    const configured = Number(process.env.HEALTH_CHECK_TIMEOUT_MS);
    if (!Number.isFinite(configured) || configured <= 0) {
      return DEFAULT_HEALTH_CHECK_TIMEOUT_MS;
    }
    return Math.min(
      Math.max(1, Math.floor(configured)),
      MAX_HEALTH_CHECK_TIMEOUT_MS,
    );
  }
}
