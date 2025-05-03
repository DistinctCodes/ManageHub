import { Controller, Post, Body, Get, Query, UseGuards } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { CreateMonitoringDto } from './create-monitoring.dto';
import { MonitoringLog } from './monitoring.entity';
import { AdminGuard } from 'src/auth/admin.guard';

@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly service: MonitoringService) {}

  @Post()
  async create(@Body() dto: CreateMonitoringDto): Promise<MonitoringLog> {
    return this.service.createLog(dto);
  }

  @UseGuards(AdminGuard)
  @Get('by-user')
  async getByUser(@Query('userId') userId: number): Promise<MonitoringLog[]> {
    return this.service.getLogsByUser(userId);
  }

  @UseGuards(AdminGuard)
  @Get('by-date')
  async getByDate(
    @Query('start') start: string,
    @Query('end') end: string,
  ): Promise<MonitoringLog[]> {
    return this.service.getLogsByDateRange(new Date(start), new Date(end));
  }
}
