import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { UpdateMaintenanceStatusDto } from './dto/update-maintenance-status.dto';

@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  create(@Body() dto: CreateMaintenanceRequestDto) {
    return this.maintenanceService.create(dto);
  }

  @Get()
  findAll() {
    return this.maintenanceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.maintenanceService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceStatusDto,
  ) {
    return this.maintenanceService.updateStatus(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.maintenanceService.remove(id);
  }
}
