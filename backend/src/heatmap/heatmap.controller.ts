import { Controller, Get, Query } from '@nestjs/common';
import { HeatmapService } from './heatmap.service';

@Controller('heatmap')
export class HeatmapController {
  constructor(private readonly heatmapService: HeatmapService) {}

  @Get()
  getAll() {
    return this.heatmapService.getAll();
  }

  @Get('by-workspace')
  getByWorkspace(@Query('workspaceId') workspaceId: string) {
    return this.heatmapService.getByWorkspace(workspaceId);
  }

  @Get('by-timeslot')
  getByTimeSlot(@Query('timeSlot') timeSlot: string) {
    return this.heatmapService.getByTimeSlot(timeSlot);
  }
} 