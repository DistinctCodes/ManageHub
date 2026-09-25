import { Controller, Get, Header, Res } from '@nestjs/common';
import { Response } from 'express';
import { AppService } from './app.service';
import { MetricsService } from './common/metrics.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly metrics: MetricsService,
  ) {}

  /**
   * Legacy combined dependency view retained for operators that used the old
   * health route. Orchestrator probes use the dedicated liveness and readiness
   * routes in HealthController, so this route must not shadow `/health`.
   */
  @Get('health/dependencies')
  async getHealth(@Res({ passthrough: true }) res: Response) {
    const health = await this.appService.getHealth();
    if (health.status !== 'ok') {
      res.status(503);
    }
    return health;
  }

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  getMetrics(): string {
    return this.metrics.renderPrometheus();
  }
}
