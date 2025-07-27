import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DeviceMaintenanceService } from './device-maintenance.service';
import { CreateDeviceDto, UpdateDeviceDto } from './dto/create-device.dto';
import {
  CreateMaintenanceDto,
  UpdateMaintenanceDto,
} from './dto/create-maintenance.dto';

@ApiTags('Device Maintenance')
@Controller('device-maintenance')
export class DeviceMaintenanceController {
  constructor(
    private readonly deviceMaintenanceService: DeviceMaintenanceService,
  ) {}

  // Device endpoints
  @Post('devices')
  @ApiOperation({ summary: 'Create a new device' })
  @ApiResponse({ status: 201, description: 'Device created successfully' })
  createDevice(@Body() dto: CreateDeviceDto) {
    return this.deviceMaintenanceService.createDevice(dto);
  }

  @Get('devices')
  @ApiOperation({ summary: 'Get all devices' })
  getAllDevices() {
    return this.deviceMaintenanceService.getAllDevices();
  }

  @Get('devices/:id')
  @ApiOperation({ summary: 'Get device by ID' })
  getDeviceById(@Param('id') id: string) {
    return this.deviceMaintenanceService.getDeviceById(id);
  }

  @Put('devices/:id')
  @ApiOperation({ summary: 'Update device' })
  updateDevice(@Param('id') id: string, @Body() dto: UpdateDeviceDto) {
    return this.deviceMaintenanceService.updateDevice(id, dto);
  }

  @Delete('devices/:id')
  @ApiOperation({ summary: 'Delete device' })
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteDevice(@Param('id') id: string) {
    return this.deviceMaintenanceService.deleteDevice(id);
  }

  // Maintenance record endpoints
  @Post('maintenance')
  @ApiOperation({ summary: 'Create a new maintenance record' })
  @ApiResponse({
    status: 201,
    description: 'Maintenance record created successfully',
  })
  createMaintenanceRecord(@Body() dto: CreateMaintenanceDto) {
    return this.deviceMaintenanceService.createMaintenanceRecord(dto);
  }

  @Get('maintenance')
  @ApiOperation({ summary: 'Get all maintenance records' })
  getAllMaintenanceRecords() {
    return this.deviceMaintenanceService.getAllMaintenanceRecords();
  }

  @Get('maintenance/:id')
  @ApiOperation({ summary: 'Get maintenance record by ID' })
  getMaintenanceRecordById(@Param('id') id: string) {
    return this.deviceMaintenanceService.getMaintenanceRecordById(id);
  }

  @Get('devices/:deviceId/maintenance')
  @ApiOperation({ summary: 'Get maintenance records for a specific device' })
  getMaintenanceRecordsByDevice(@Param('deviceId') deviceId: string) {
    return this.deviceMaintenanceService.getMaintenanceRecordsByDevice(
      deviceId,
    );
  }

  @Put('maintenance/:id')
  @ApiOperation({ summary: 'Update maintenance record' })
  updateMaintenanceRecord(
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceDto,
  ) {
    return this.deviceMaintenanceService.updateMaintenanceRecord(id, dto);
  }

  @Post('maintenance/:id/start')
  @ApiOperation({ summary: 'Start maintenance work' })
  startMaintenance(@Param('id') id: string) {
    return this.deviceMaintenanceService.startMaintenance(id);
  }

  @Post('maintenance/:id/complete')
  @ApiOperation({ summary: 'Complete maintenance work' })
  completeMaintenance(
    @Param('id') id: string,
    @Body() body: { notes?: string },
  ) {
    return this.deviceMaintenanceService.completeMaintenance(id, body.notes);
  }

  @Delete('maintenance/:id')
  @ApiOperation({ summary: 'Delete maintenance record' })
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMaintenanceRecord(@Param('id') id: string) {
    return this.deviceMaintenanceService.deleteMaintenanceRecord(id);
  }

  // Scheduling and analytics endpoints
  @Get('schedule')
  @ApiOperation({ summary: 'Get maintenance schedule for all devices' })
  getMaintenanceSchedule() {
    return this.deviceMaintenanceService.getMaintenanceSchedule();
  }

  @Get('schedule/overdue')
  @ApiOperation({ summary: 'Get overdue devices' })
  getOverdueDevices() {
    return this.deviceMaintenanceService.getOverdueDevices();
  }

  @Get('schedule/upcoming')
  @ApiOperation({ summary: 'Get upcoming maintenance' })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days to look ahead (default: 30)',
  })
  getUpcomingMaintenance(@Query('days') days?: string) {
    const daysAhead = days ? parseInt(days) : 30;
    return this.deviceMaintenanceService.getUpcomingMaintenance(daysAhead);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get maintenance statistics' })
  getMaintenanceStats() {
    return this.deviceMaintenanceService.getMaintenanceStats();
  }
}
