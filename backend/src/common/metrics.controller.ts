import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { MetricsService } from './metrics.service';
import { MetricsAuthGuard } from './metrics-auth.guard';

/**
 * Prometheus scrape endpoint (issue BE-141). Serves every gauge/counter/
 * summary/histogram the app records in OpenMetrics text format, including
 * the `managehub_manual_review_queue_depth` gauge maintained by the
 * reconciliation cron — so the manual-review queue depth can be alerted on
 * externally (e.g. Prometheus + Alertmanager) rather than only via log
 * lines. Exempt from rate limiting (a scrape happens on its own fixed
 * interval, not user traffic) but gated by MetricsAuthGuard (issue #1781)
 * — see that guard for the token requirement and the METRICS_ACCESS_TOKEN
 * env var. Network-level access control remains a valid complementary
 * layer on top of the token.
 */
@ApiExcludeController()
@SkipThrottle()
@UseGuards(MetricsAuthGuard)
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  scrape(): string {
    return this.metrics.renderPrometheus();
  }
}
