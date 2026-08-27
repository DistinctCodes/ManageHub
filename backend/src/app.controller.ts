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

  @Get('health')
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
