import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DeviceTrackerService } from './device-tracker.service';
import { CreateDeviceTrackerDto } from './dto/create-device-tracker.dto';
import { UpdateDeviceTrackerDto } from './dto/update-device-tracker.dto';
import { DeviceTrackerQueryDto } from './dto/device-tracker-query.dto';

@Controller('device-tracker')
export class DeviceTrackerController {
  constructor(private readonly deviceTrackerService: DeviceTrackerService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDeviceTrackerDto: CreateDeviceTrackerDto) {
    return await this.deviceTrackerService.create(createDeviceTrackerDto);
  }

  @Get()
  async findAll(@Query() queryDto: DeviceTrackerQueryDto) {
    return await this.deviceTrackerService.findAll(queryDto);
  }

  @Get('statistics')
  async getStatistics() {
    return await this.deviceTrackerService.getDeviceStatistics();
  }

  @Get('user/:userId')
  async findByUserId(@Param('userId') userId: string) {
    return await this.deviceTrackerService.findByUserId(userId);
  }

  @Get('ip/:ipAddress')
  async findByIpAddress(@Param('ipAddress') ipAddress: string) {
    return await this.deviceTrackerService.findByIpAddress(ipAddress);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.deviceTrackerService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDeviceTrackerDto: UpdateDeviceTrackerDto,
  ) {
    return await this.deviceTrackerService.update(id, updateDeviceTrackerDto);
  }

  @Patch(':id/last-seen')
  @HttpCode(HttpStatus.OK)
  async updateLastSeen(@Param('id') id: string) {
    return await this.deviceTrackerService.updateLastSeen(id);
  }

  @Patch(':id/trust')
  @HttpCode(HttpStatus.OK)
  async markAsTrusted(@Param('id') id: string) {
    return await this.deviceTrackerService.markAsTrusted(id);
  }

  @Patch(':id/untrust')
  @HttpCode(HttpStatus.OK)
  async markAsUntrusted(@Param('id') id: string) {
    return await this.deviceTrackerService.markAsUntrusted(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.deviceTrackerService.remove(id);
  }

  @Delete('cleanup/:days')
  @HttpCode(HttpStatus.OK)
  async cleanupOldEntries(@Param('days') days: string) {
    const daysToKeep = parseInt(days, 10);
    const deletedCount = await this.deviceTrackerService.cleanupOldEntries(daysToKeep);
    return { deletedCount, message: `Cleaned up ${deletedCount} old device tracker entries` };
  }
}