import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { MetricsService } from './metrics.service';

/**
 * Prometheus scrape endpoint (issue BE-141). Serves every gauge/counter/
 * summary the app records in OpenMetrics text format, including the
 * `managehub_manual_review_queue_depth` gauge maintained by the
 * reconciliation cron — so the manual-review queue depth can be alerted on
 * externally (e.g. Prometheus + Alertmanager) rather than only via log
 * lines. Deliberately unauthenticated (a scrape target has no bearer
 * token) and exempt from rate limiting; network-level access control is the
 * operator's responsibility.
 */
@ApiExcludeController()
@SkipThrottle()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  scrape(): string {
    return this.metrics.renderPrometheus();
  }
}
