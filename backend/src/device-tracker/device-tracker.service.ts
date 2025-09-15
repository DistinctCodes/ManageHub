import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import {
  DeviceTracker,
  DeviceType,
  DeviceStatus,
  RiskLevel,
} from './entities/device-tracker.entity';
import { CreateDeviceTrackerDto } from './dto/create-device-tracker.dto';
import { UpdateDeviceTrackerDto } from './dto/update-device-tracker.dto';
import { DeviceTrackerQueryDto } from './dto/device-tracker-query.dto';
import { DeviceRiskAssessmentService } from './services/device-risk-assessment.service';
import { GeolocationService } from './services/geolocation.service';
import { DeviceAnomalyDetectionService } from './services/device-anomaly-detection.service';

@Injectable()
export class DeviceTrackerService {
  constructor(
    @InjectRepository(DeviceTracker)
    private deviceTrackerRepository: Repository<DeviceTracker>,
    private riskAssessmentService: DeviceRiskAssessmentService,
    private geolocationService: GeolocationService,
    private anomalyDetectionService: DeviceAnomalyDetectionService,
  ) {}

  async create(
    createDeviceTrackerDto: CreateDeviceTrackerDto,
  ): Promise<DeviceTracker> {
    try {
      // Enhance with geolocation data if IP address provided
      let enhancedData = { ...createDeviceTrackerDto };
      if (createDeviceTrackerDto.ipAddress) {
        enhancedData = (await this.geolocationService.updateDeviceGeolocation(
          enhancedData,
        )) as CreateDeviceTrackerDto;
      }

      // Perform risk assessment
      const existingDevices = createDeviceTrackerDto.userId
        ? await this.findByUserId(createDeviceTrackerDto.userId)
        : [];

      const securityFlags = this.riskAssessmentService.assessSecurityFlags(
        enhancedData,
        existingDevices,
      );

      const riskAssessment = this.riskAssessmentService.calculateRiskScore(
        enhancedData,
        securityFlags,
        existingDevices,
      );

      // Apply risk assessment results
      enhancedData.riskScore = riskAssessment.riskScore;
      enhancedData.riskLevel = riskAssessment.riskLevel;
      enhancedData.status = riskAssessment.shouldBlock
        ? DeviceStatus.BLOCKED
        : DeviceStatus.ACTIVE;

      const deviceTracker = this.deviceTrackerRepository.create(
        enhancedData as any,
      );
      const savedDevice =
        await this.deviceTrackerRepository.save(deviceTracker);

      // Trigger anomaly detection for new device
      if (createDeviceTrackerDto.userId) {
        await this.anomalyDetectionService.detectUserAnomalies(
          createDeviceTrackerDto.userId,
          [savedDevice, ...existingDevices],
        );
      }

      return savedDevice;
    } catch (error) {
      throw new BadRequestException('Failed to create device tracker entry');
    }
  }

  async findAll(queryDto: DeviceTrackerQueryDto = {}): Promise<{
    data: DeviceTracker[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const {
      userId,
      deviceType,
      ipAddress,
      isTrusted,
      fromDate,
      toDate,
      limit = '50',
      offset = '0',
    } = queryDto;

    const query =
      this.deviceTrackerRepository.createQueryBuilder('deviceTracker');

    // Apply filters
    if (userId) {
      query.andWhere('deviceTracker.userId = :userId', { userId });
    }

    if (deviceType) {
      query.andWhere('deviceTracker.deviceType LIKE :deviceType', {
        deviceType: `%${deviceType}%`,
      });
    }

    if (ipAddress) {
      query.andWhere('deviceTracker.ipAddress = :ipAddress', { ipAddress });
    }

    if (isTrusted !== undefined) {
      query.andWhere('deviceTracker.isTrusted = :isTrusted', { isTrusted });
    }

    if (fromDate && toDate) {
      query.andWhere('deviceTracker.createdAt BETWEEN :fromDate AND :toDate', {
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
      });
    } else if (fromDate) {
      query.andWhere('deviceTracker.createdAt >= :fromDate', {
        fromDate: new Date(fromDate),
      });
    } else if (toDate) {
      query.andWhere('deviceTracker.createdAt <= :toDate', {
        toDate: new Date(toDate),
      });
    }

    // Apply pagination
    const limitNum = parseInt(limit, 10);
    const offsetNum = parseInt(offset, 10);

    if (limitNum > 100) {
      throw new BadRequestException('Limit cannot exceed 100');
    }

    query.limit(limitNum).offset(offsetNum);
    query.orderBy('deviceTracker.lastSeenAt', 'DESC');

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      limit: limitNum,
      offset: offsetNum,
    };
  }

  async findOne(id: string): Promise<DeviceTracker> {
    const deviceTracker = await this.deviceTrackerRepository.findOne({
      where: { id },
    });

    if (!deviceTracker) {
      throw new NotFoundException('Device tracker entry not found');
    }

    return deviceTracker;
  }

  async findByUserId(userId: string): Promise<DeviceTracker[]> {
    return await this.deviceTrackerRepository.find({
      where: { userId },
      order: { lastSeenAt: 'DESC' },
    });
  }

  async findByIpAddress(ipAddress: string): Promise<DeviceTracker[]> {
    return await this.deviceTrackerRepository.find({
      where: { ipAddress },
      order: { lastSeenAt: 'DESC' },
    });
  }

  async update(
    id: string,
    updateDeviceTrackerDto: UpdateDeviceTrackerDto,
  ): Promise<DeviceTracker> {
    const deviceTracker = await this.findOne(id);

    Object.assign(deviceTracker, updateDeviceTrackerDto);
    return await this.deviceTrackerRepository.save(deviceTracker);
  }

  async remove(id: string): Promise<void> {
    const deviceTracker = await this.findOne(id);
    await this.deviceTrackerRepository.remove(deviceTracker);
  }

  async updateLastSeen(id: string): Promise<DeviceTracker> {
    const deviceTracker = await this.findOne(id);
    deviceTracker.lastSeenAt = new Date();
    return await this.deviceTrackerRepository.save(deviceTracker);
  }

  async markAsTrusted(id: string): Promise<DeviceTracker> {
    const deviceTracker = await this.findOne(id);
    deviceTracker.isTrusted = true;
    return await this.deviceTrackerRepository.save(deviceTracker);
  }

  async markAsUntrusted(id: string): Promise<DeviceTracker> {
    const deviceTracker = await this.findOne(id);
    deviceTracker.isTrusted = false;
    return await this.deviceTrackerRepository.save(deviceTracker);
  }

  async getDeviceStatistics(): Promise<{
    totalDevices: number;
    trustedDevices: number;
    untrustedDevices: number;
    deviceTypeBreakdown: Array<{ deviceType: string; count: number }>;
    recentActivity: DeviceTracker[];
  }> {
    const totalDevices = await this.deviceTrackerRepository.count();
    const trustedDevices = await this.deviceTrackerRepository.count({
      where: { isTrusted: true },
    });
    const untrustedDevices = totalDevices - trustedDevices;

    // Get device type breakdown
    const deviceTypeBreakdown = await this.deviceTrackerRepository
      .createQueryBuilder('deviceTracker')
      .select('deviceTracker.deviceType', 'deviceType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('deviceTracker.deviceType')
      .getRawMany();

    // Get recent activity (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentActivity = await this.deviceTrackerRepository.find({
      where: {
        lastSeenAt: Between(yesterday, new Date()),
      },
      order: { lastSeenAt: 'DESC' },
      take: 10,
    });

    return {
      totalDevices,
      trustedDevices,
      untrustedDevices,
      deviceTypeBreakdown: deviceTypeBreakdown.map((item) => ({
        deviceType: item.deviceType,
        count: parseInt(item.count, 10),
      })),
      recentActivity,
    };
  }

  async cleanupOldEntries(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.deviceTrackerRepository
      .createQueryBuilder()
      .delete()
      .where('lastSeenAt < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }

  // Enhanced methods with security features
  async getSecurityDashboard(): Promise<{
    overview: {
      totalDevices: number;
      activeDevices: number;
      blockedDevices: number;
      suspiciousDevices: number;
      highRiskDevices: number;
    };
    riskDistribution: Record<string, number>;
    locationAnalysis: {
      topCountries: Array<{ country: string; count: number }>;
      vpnUsage: number;
      torUsage: number;
      proxyUsage: number;
    };
    recentActivity: DeviceTracker[];
    anomalies: any[];
  }> {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Overview statistics
    const totalDevices = await this.deviceTrackerRepository.count();
    const activeDevices = await this.deviceTrackerRepository.count({
      where: { lastSeenAt: Between(dayAgo, now) },
    });
    const blockedDevices = await this.deviceTrackerRepository.count({
      where: { status: DeviceStatus.BLOCKED },
    });
    const suspiciousDevices = await this.deviceTrackerRepository.count({
      where: { status: DeviceStatus.SUSPICIOUS },
    });
    const highRiskDevices = await this.deviceTrackerRepository.count({
      where: { riskLevel: RiskLevel.HIGH },
    });

    // Risk distribution
    const riskDistribution: Record<string, number> = {};
    for (const level of Object.values(RiskLevel)) {
      riskDistribution[level] = await this.deviceTrackerRepository.count({
        where: { riskLevel: level },
      });
    }

    // Location analysis
    const countryStats = await this.deviceTrackerRepository
      .createQueryBuilder('device')
      .select('device.countryName', 'country')
      .addSelect('COUNT(*)', 'count')
      .where('device.countryName IS NOT NULL')
      .groupBy('device.countryName')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    const vpnUsage = await this.deviceTrackerRepository.count({
      where: { isVpn: true },
    });
    const torUsage = await this.deviceTrackerRepository.count({
      where: { isTor: true },
    });
    const proxyUsage = await this.deviceTrackerRepository.count({
      where: { isProxy: true },
    });

    // Recent activity
    const recentActivity = await this.deviceTrackerRepository.find({
      where: { lastSeenAt: Between(dayAgo, now) },
      order: { lastSeenAt: 'DESC' },
      take: 20,
    });

    // Get recent anomalies
    const anomalies = await this.anomalyDetectionService.getAllAnomalies();
    const recentAnomalies = anomalies.slice(0, 10);

    return {
      overview: {
        totalDevices,
        activeDevices,
        blockedDevices,
        suspiciousDevices,
        highRiskDevices,
      },
      riskDistribution,
      locationAnalysis: {
        topCountries: countryStats.map((stat) => ({
          country: stat.country,
          count: parseInt(stat.count, 10),
        })),
        vpnUsage,
        torUsage,
        proxyUsage,
      },
      recentActivity,
      anomalies: recentAnomalies,
    };
  }

  async performSecurityScan(deviceId: string): Promise<{
    device: DeviceTracker;
    riskAssessment: any;
    anomalies: any[];
    recommendations: string[];
  }> {
    const device = await this.findOne(deviceId);

    // Get user's other devices for context
    const otherDevices = device.userId
      ? await this.findByUserId(device.userId)
      : [];

    // Perform risk assessment
    const securityFlags = this.riskAssessmentService.assessSecurityFlags(
      device,
      otherDevices,
    );

    const riskAssessment = this.riskAssessmentService.calculateRiskScore(
      device,
      securityFlags,
      otherDevices,
    );

    // Get device anomalies
    const anomalies =
      await this.anomalyDetectionService.getDeviceAnomalies(deviceId);

    // Generate recommendations
    const recommendations = [...riskAssessment.recommendations];

    if (
      device.riskLevel === RiskLevel.HIGH ||
      device.riskLevel === RiskLevel.CRITICAL
    ) {
      recommendations.push('Consider blocking this device');
    }

    if (anomalies.length > 0) {
      recommendations.push('Review detected anomalies');
    }

    return {
      device,
      riskAssessment,
      anomalies,
      recommendations,
    };
  }

  async blockDevice(
    deviceId: string,
    reason: string,
    blockedBy?: string,
  ): Promise<DeviceTracker> {
    const device = await this.findOne(deviceId);

    device.status = DeviceStatus.BLOCKED;
    device.blockedAt = new Date();
    device.blockedReason = reason;
    device.blockedBy = blockedBy;
    device.riskLevel = RiskLevel.CRITICAL;

    return await this.deviceTrackerRepository.save(device);
  }

  async unblockDevice(deviceId: string): Promise<DeviceTracker> {
    const device = await this.findOne(deviceId);

    device.status = DeviceStatus.ACTIVE;
    device.blockedAt = undefined;
    device.blockedReason = undefined;
    device.blockedBy = undefined;
    device.riskLevel = RiskLevel.LOW;
    device.riskScore = 0;

    return await this.deviceTrackerRepository.save(device);
  }

  async getDevicesByRiskLevel(riskLevel: RiskLevel): Promise<DeviceTracker[]> {
    return await this.deviceTrackerRepository.find({
      where: { riskLevel },
      order: { riskScore: 'DESC' },
    });
  }

  async getDevicesByLocation(countryCode: string): Promise<DeviceTracker[]> {
    return await this.deviceTrackerRepository.find({
      where: { countryCode },
      order: { lastSeenAt: 'DESC' },
    });
  }

  async getSuspiciousDevices(): Promise<DeviceTracker[]> {
    return await this.deviceTrackerRepository.find({
      where: [
        { status: DeviceStatus.SUSPICIOUS },
        { riskLevel: RiskLevel.HIGH },
        { riskLevel: RiskLevel.CRITICAL },
        { isVpn: true },
        { isTor: true },
      ],
      order: { riskScore: 'DESC' },
    });
  }

  async recordFailedAttempt(deviceId: string): Promise<void> {
    await this.deviceTrackerRepository.increment(
      { id: deviceId },
      'failedAttempts',
      1,
    );

    // Check if device should be blocked due to too many failed attempts
    const device = await this.findOne(deviceId);
    if (device.failedAttempts >= 10) {
      await this.blockDevice(
        deviceId,
        `Automatic block due to ${device.failedAttempts} failed attempts`,
        'system',
      );
    }
  }

  async recordSuccessfulLogin(deviceId: string): Promise<void> {
    await this.deviceTrackerRepository.update(
      { id: deviceId },
      {
        lastLoginAt: new Date(),
        failedAttempts: 0, // Reset failed attempts on successful login
      },
    );

    await this.deviceTrackerRepository.increment(
      { id: deviceId },
      'loginCount',
      1,
    );
  }
}
