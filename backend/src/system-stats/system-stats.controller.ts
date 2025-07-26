import { Controller, Get } from '@nestjs/common';
import { SystemStatsService, DailyStatsDto } from './system-stats.service';

@Controller('system')
export class SystemStatsController {
  constructor(private readonly systemStatsService: SystemStatsService) {}

  @Get('daily-stats')
  getDailyStats(): DailyStatsDto {
    return this.systemStatsService.getDailyStats();
  }
}
