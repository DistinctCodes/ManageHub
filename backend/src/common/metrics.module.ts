import { Global, Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';

/**
 * Single process-wide `MetricsService` (issue #1780, #1948).
 *
 * The metrics registry is an in-memory singleton that the `/metrics`
 * controller renders. Every producer — the HTTP latency interceptor, the
 * retention job, the reconciliation and settlement jobs, wallet key
 * rotation — must record against that same instance or their series never
 * appear on the scrape endpoint. Making the provider global is what
 * guarantees that: a module-local `MetricsService` would be a second,
 * invisible registry.
 */
@Global()
@Module({
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
