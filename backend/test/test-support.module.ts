import { Global, Module } from '@nestjs/common';
import { MetricsService } from '../src/common/metrics.service';

/**
 * Test-only plumbing for the e2e app (issue #1953).
 *
 * On the current main, `MetricsService` is provided only by AppModule and
 * never exported, while PaymentsModule/CreditsModule inject it — so the full
 * AppModule cannot be instantiated (Nest fails to resolve SettlementService /
 * PaymentsService). That is pre-existing breakage owned by another branch, so
 * instead of changing production wiring this global module exports the same
 * MetricsService to the whole test graph. MetricsService holds only in-memory
 * counters, so a second instance is harmless.
 */
@Global()
@Module({
  providers: [MetricsService],
  exports: [MetricsService],
})
export class TestSupportModule {}
