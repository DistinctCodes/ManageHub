import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { AssetMaintenanceService } from './asset-maintenance.service';
import { CreateMaintenanceDto } from 'src/create-maintenance/create-maintenance.dto';
import { CompleteMaintenanceDto } from 'src/complete-maintenance/complete-maintenance.dto';

@Controller('asset-maintenance')
export class AssetMaintenanceController {
  constructor(private readonly maintenanceService: AssetMaintenanceService) {}

  @Post()
  schedule(@Body() dto: CreateMaintenanceDto) {
    return this.maintenanceService.schedule(dto);
  }

  @Patch(':id/complete')
  markComplete(@Param('id', ParseIntPipe) id: number, @Body() dto: CompleteMaintenanceDto) {
    return this.maintenanceService.markComplete(id, dto);
  }

  @Get(':assetId/history')
  getHistory(@Param('assetId', ParseIntPipe) assetId: number) {
    return this.maintenanceService.getHistory(assetId);
  }
}
