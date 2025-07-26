import { Controller, Get, Query } from '@nestjs/common';
import { HeatmapService } from './heatmap.service';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

@ApiTags('Heatmap')
@Controller('heatmap')
export class HeatmapController {
  constructor(private readonly heatmapService: HeatmapService) {}

  @Get()
  @ApiOperation({ summary: 'Get all heatmap data' })
  @ApiResponse({ status: 200, description: 'All heatmap data returned.' })
  getAll() {
    return this.heatmapService.getAll();
  }

  @Get('by-workspace')
  @ApiOperation({ summary: 'Get heatmap data by workspace' })
  @ApiQuery({ name: 'workspaceId', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Heatmap data for a specific workspace.' })
  getByWorkspace(@Query('workspaceId') workspaceId: string) {
    return this.heatmapService.getByWorkspace(workspaceId);
  }

  @Get('by-timeslot')
  @ApiOperation({ summary: 'Get heatmap data by time slot' })
  @ApiQuery({ name: 'timeSlot', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Heatmap data for a specific time slot.' })
  getByTimeSlot(@Query('timeSlot') timeSlot: string) {
    return this.heatmapService.getByTimeSlot(timeSlot);
  }
} 