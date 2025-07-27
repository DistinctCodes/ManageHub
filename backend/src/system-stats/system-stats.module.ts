import { Module } from '@nestjs/common';
import { SystemStatsController } from './system-stats.controller';
import { SystemStatsService } from './system-stats.service';

@Module({
  controllers: [SystemStatsController],
  providers: [SystemStatsService],
})
export class SystemStatsModule {}
