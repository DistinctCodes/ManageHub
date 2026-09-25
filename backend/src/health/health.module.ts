import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';

/**
 * Keeps probe wiring isolated from business modules. TerminusModule supplies
 * HealthCheckService and TypeOrmHealthIndicator; the root TypeORM module
 * remains the source of the database connection that the indicator pings.
 */
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}
