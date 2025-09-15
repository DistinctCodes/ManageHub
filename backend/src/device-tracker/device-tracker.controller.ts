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
  UseGuards,
} from '@nestjs/common';
import { DeviceTrackerService } from './device-tracker.service';
import { DeviceSessionService } from './services/device-session.service';
import { DeviceAnomalyDetectionService } from './services/device-anomaly-detection.service';
import { CreateDeviceTrackerDto } from './dto/create-device-tracker.dto';
import { UpdateDeviceTrackerDto } from './dto/update-device-tracker.dto';
import { DeviceTrackerQueryDto } from './dto/device-tracker-query.dto';
import { DeviceSecurityGuard } from './guards/device-security.guard';
import { RiskLevel } from './entities/device-tracker.entity';

@Controller('device-tracker')
@UseGuards(DeviceSecurityGuard)
export class DeviceTrackerController {
  constructor(
    private readonly deviceTrackerService: DeviceTrackerService,
    private readonly sessionService: DeviceSessionService,
    private readonly anomalyDetectionService: DeviceAnomalyDetectionService,
  ) {}

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

  // Enhanced Security Endpoints
  @Get('dashboard')
  async getSecurityDashboard() {
    return await this.deviceTrackerService.getSecurityDashboard();
  }

  @Get('security-scan/:id')
  async performSecurityScan(@Param('id') id: string) {
    return await this.deviceTrackerService.performSecurityScan(id);
  }

  @Post(':id/block')
  @HttpCode(HttpStatus.OK)
  async blockDevice(
    @Param('id') id: string,
    @Body() blockData: { reason: string; blockedBy?: string },
  ) {
    return await this.deviceTrackerService.blockDevice(id, blockData.reason, blockData.blockedBy);
  }

  @Post(':id/unblock')
  @HttpCode(HttpStatus.OK)
  async unblockDevice(@Param('id') id: string) {
    return await this.deviceTrackerService.unblockDevice(id);
  }

  @Get('risk-level/:level')
  async getDevicesByRiskLevel(@Param('level') level: string) {
    const riskLevel = level.toUpperCase() as RiskLevel;
    return await this.deviceTrackerService.getDevicesByRiskLevel(riskLevel);
  }

  @Get('suspicious')
  async getSuspiciousDevices() {
    return await this.deviceTrackerService.getSuspiciousDevices();
  }

  @Get('location/:countryCode')
  async getDevicesByLocation(@Param('countryCode') countryCode: string) {
    return await this.deviceTrackerService.getDevicesByLocation(countryCode);
  }

  @Post(':id/failed-attempt')
  @HttpCode(HttpStatus.OK)
  async recordFailedAttempt(@Param('id') id: string) {
    await this.deviceTrackerService.recordFailedAttempt(id);
    return { message: 'Failed attempt recorded' };
  }

  @Post(':id/successful-login')
  @HttpCode(HttpStatus.OK)
  async recordSuccessfulLogin(@Param('id') id: string) {
    await this.deviceTrackerService.recordSuccessfulLogin(id);
    return { message: 'Successful login recorded' };
  }

  // Session Management Endpoints
  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  async createSession(
    @Body() sessionData: {
      deviceId: string;
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    return await this.sessionService.createSession(
      sessionData.deviceId,
      sessionData.userId,
      sessionData.ipAddress,
      sessionData.userAgent,
    );
  }

  @Get('sessions/:token')
  async getSession(@Param('token') token: string) {
    const session = await this.sessionService.getSession(token);
    if (!session) {
      return { error: 'Session not found or expired' };
    }
    return session;
  }

  @Delete('sessions/:token')
  @HttpCode(HttpStatus.NO_CONTENT)
  async terminateSession(@Param('token') token: string) {
    await this.sessionService.terminateSession(token);
  }

  @Get('sessions/device/:deviceId')
  async getDeviceSessions(@Param('deviceId') deviceId: string) {
    return await this.sessionService.getActiveSessionsForDevice(deviceId);
  }

  @Get('sessions/user/:userId')
  async getUserSessions(@Param('userId') userId: string) {
    return await this.sessionService.getActiveSessionsForUser(userId);
  }

  @Delete('sessions/device/:deviceId')
  @HttpCode(HttpStatus.OK)
  async terminateDeviceSessions(@Param('deviceId') deviceId: string) {
    const count = await this.sessionService.terminateAllSessionsForDevice(deviceId);
    return { terminatedSessions: count };
  }

  @Delete('sessions/user/:userId')
  @HttpCode(HttpStatus.OK)
  async terminateUserSessions(@Param('userId') userId: string) {
    const count = await this.sessionService.terminateAllSessionsForUser(userId);
    return { terminatedSessions: count };
  }

  @Get('sessions/summary')
  async getSessionSummary() {
    return await this.sessionService.getSessionSummary();
  }

  @Get('sessions/suspicious')
  async getSuspiciousSessions() {
    return await this.sessionService.getSuspiciousSessions();
  }

  // Anomaly Detection Endpoints
  @Get('anomalies')
  async getAllAnomalies() {
    return await this.anomalyDetectionService.getAllAnomalies();
  }

  @Get('anomalies/device/:deviceId')
  async getDeviceAnomalies(@Param('deviceId') deviceId: string) {
    return await this.anomalyDetectionService.getDeviceAnomalies(deviceId);
  }

  @Get('anomalies/statistics')
  async getAnomalyStatistics() {
    return await this.anomalyDetectionService.getAnomalyStatistics();
  }

  @Post('anomalies/scan')
  @HttpCode(HttpStatus.OK)
  async triggerAnomalyDetection() {
    await this.anomalyDetectionService.runAnomalyDetection();
    return { message: 'Anomaly detection scan triggered' };
  }
}