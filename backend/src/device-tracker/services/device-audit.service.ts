import { Injectable, Logger } from '@nestjs/common';
import {
  DeviceTracker,
  DeviceStatus,
  RiskLevel,
} from '../entities/device-tracker.entity';
import { AnomalyDetectionResult } from './device-anomaly-detection.service';
import { DeviceSession } from './device-session.service';

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  userId?: string;
  deviceId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  action: string;
  description: string;
  details: Record<string, any>;
  outcome: 'success' | 'failure' | 'blocked' | 'warning';
  riskScore?: number;
  location?: {
    country?: string;
    city?: string;
    coordinates?: { lat: number; lon: number };
  };
}

export enum AuditEventType {
  DEVICE_REGISTRATION = 'device_registration',
  DEVICE_AUTHENTICATION = 'device_authentication',
  SESSION_CREATED = 'session_created',
  SESSION_TERMINATED = 'session_terminated',
  DEVICE_BLOCKED = 'device_blocked',
  DEVICE_UNBLOCKED = 'device_unblocked',
  RISK_ASSESSMENT = 'risk_assessment',
  ANOMALY_DETECTED = 'anomaly_detected',
  SECURITY_VIOLATION = 'security_violation',
  FAILED_AUTHENTICATION = 'failed_authentication',
  LOCATION_CHANGE = 'location_change',
  DEVICE_UPDATE = 'device_update',
  ADMIN_ACTION = 'admin_action',
  SYSTEM_ACTION = 'system_action',
  DATA_ACCESS = 'data_access',
  CONFIGURATION_CHANGE = 'configuration_change',
}

export interface AuditQueryOptions {
  startDate?: Date;
  endDate?: Date;
  eventTypes?: AuditEventType[];
  severities?: string[];
  userId?: string;
  deviceId?: string;
  ipAddress?: string;
  outcome?: string;
  limit?: number;
  offset?: number;
}

export interface AuditStatistics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  eventsByOutcome: Record<string, number>;
  topUsers: Array<{ userId: string; eventCount: number }>;
  topDevices: Array<{ deviceId: string; eventCount: number }>;
  topIPs: Array<{ ipAddress: string; eventCount: number }>;
  recentCriticalEvents: AuditLogEntry[];
  timeline: Array<{ date: string; count: number }>;
}

@Injectable()
export class DeviceAuditService {
  private readonly logger = new Logger(DeviceAuditService.name);
  private readonly auditLogs: Map<string, AuditLogEntry> = new Map();
  private readonly maxLogEntries = 100000; // Limit memory usage

  async logDeviceRegistration(
    device: DeviceTracker,
    context?: Record<string, any>,
  ): Promise<void> {
    const entry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      eventType: AuditEventType.DEVICE_REGISTRATION,
      severity: 'info',
      source: 'device-tracker',
      userId: device.userId,
      deviceId: device.id,
      ipAddress: device.ipAddress,
      userAgent: device.userAgent,
      action: 'register_device',
      description: `New device registered: ${device.deviceType} from ${device.location}`,
      details: {
        device: {
          type: device.deviceType,
          fingerprint: device.deviceFingerprint,
          trusted: device.isTrusted,
          riskScore: device.riskScore,
          riskLevel: device.riskLevel,
        },
        geolocation: {
          country: device.countryName,
          city: device.city,
          coordinates:
            device.latitude && device.longitude
              ? {
                  lat: device.latitude,
                  lon: device.longitude,
                }
              : undefined,
        },
        securityFlags: {
          isVpn: device.isVpn,
          isTor: device.isTor,
          isProxy: device.isProxy,
          isHosting: device.isHosting,
        },
        context,
      },
      outcome: 'success',
      riskScore: device.riskScore,
      location: {
        country: device.countryName,
        city: device.city,
        coordinates:
          device.latitude && device.longitude
            ? {
                lat: device.latitude,
                lon: device.longitude,
              }
            : undefined,
      },
    };

    await this.storeAuditLog(entry);
  }

  async logDeviceAuthentication(
    device: DeviceTracker,
    success: boolean,
    reason?: string,
    context?: Record<string, any>,
  ): Promise<void> {
    const entry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      eventType: AuditEventType.DEVICE_AUTHENTICATION,
      severity: success ? 'info' : 'warning',
      source: 'device-tracker',
      userId: device.userId,
      deviceId: device.id,
      ipAddress: device.ipAddress,
      userAgent: device.userAgent,
      action: success ? 'authenticate_success' : 'authenticate_failure',
      description: success
        ? `Device authentication successful`
        : `Device authentication failed: ${reason}`,
      details: {
        device: {
          id: device.id,
          type: device.deviceType,
          riskScore: device.riskScore,
          status: device.status,
        },
        reason,
        context,
      },
      outcome: success ? 'success' : 'failure',
      riskScore: device.riskScore,
      location: {
        country: device.countryName,
        city: device.city,
      },
    };

    await this.storeAuditLog(entry);
  }

  async logSessionEvent(
    eventType: 'created' | 'terminated',
    session: DeviceSession,
    context?: Record<string, any>,
  ): Promise<void> {
    const entry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      eventType:
        eventType === 'created'
          ? AuditEventType.SESSION_CREATED
          : AuditEventType.SESSION_TERMINATED,
      severity: 'info',
      source: 'session-manager',
      userId: session.userId,
      deviceId: session.deviceId,
      sessionId: session.sessionToken.substring(0, 8) + '...',
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      action: `session_${eventType}`,
      description: `Device session ${eventType}`,
      details: {
        session: {
          id: session.sessionToken.substring(0, 8) + '...',
          deviceId: session.deviceId,
          isActive: session.isActive,
          lastActivity: session.lastActivity,
          expiresAt: session.expiresAt,
        },
        context,
      },
      outcome: 'success',
    };

    await this.storeAuditLog(entry);
  }

  async logDeviceBlocked(
    device: DeviceTracker,
    reason: string,
    blockedBy?: string,
    context?: Record<string, any>,
  ): Promise<void> {
    const entry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      eventType: AuditEventType.DEVICE_BLOCKED,
      severity: 'critical',
      source: 'security-system',
      userId: device.userId,
      deviceId: device.id,
      ipAddress: device.ipAddress,
      action: 'block_device',
      description: `Device blocked: ${reason}`,
      details: {
        device: {
          id: device.id,
          type: device.deviceType,
          riskScore: device.riskScore,
          riskLevel: device.riskLevel,
        },
        blockInfo: {
          reason,
          blockedBy,
          blockedAt: device.blockedAt,
        },
        context,
      },
      outcome: 'blocked',
      riskScore: device.riskScore,
      location: {
        country: device.countryName,
        city: device.city,
      },
    };

    await this.storeAuditLog(entry);
  }

  async logAnomalyDetected(
    anomaly: AnomalyDetectionResult,
    context?: Record<string, any>,
  ): Promise<void> {
    const entry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      eventType: AuditEventType.ANOMALY_DETECTED,
      severity: anomaly.severity as any,
      source: 'anomaly-detector',
      deviceId: anomaly.deviceId,
      action: 'anomaly_detected',
      description: `Anomaly detected: ${anomaly.description}`,
      details: {
        anomaly: {
          type: anomaly.anomalyType,
          riskScore: anomaly.riskScore,
          evidence: anomaly.evidence,
          recommendations: anomaly.recommendations,
        },
        context,
      },
      outcome: 'warning',
      riskScore: anomaly.riskScore,
    };

    await this.storeAuditLog(entry);
  }

  async logSecurityViolation(violation: {
    type: string;
    description: string;
    severity: 'warning' | 'error' | 'critical';
    deviceId?: string;
    userId?: string;
    ipAddress?: string;
    details?: Record<string, any>;
  }): Promise<void> {
    const entry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      eventType: AuditEventType.SECURITY_VIOLATION,
      severity: violation.severity,
      source: 'security-system',
      userId: violation.userId,
      deviceId: violation.deviceId,
      ipAddress: violation.ipAddress,
      action: 'security_violation',
      description: violation.description,
      details: {
        violationType: violation.type,
        ...violation.details,
      },
      outcome: 'blocked',
    };

    await this.storeAuditLog(entry);
  }

  async logRiskAssessment(
    device: DeviceTracker,
    oldRiskScore: number,
    newRiskScore: number,
    riskFactors: string[],
    context?: Record<string, any>,
  ): Promise<void> {
    const entry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      eventType: AuditEventType.RISK_ASSESSMENT,
      severity:
        newRiskScore > 70 ? 'error' : newRiskScore > 40 ? 'warning' : 'info',
      source: 'risk-assessor',
      userId: device.userId,
      deviceId: device.id,
      ipAddress: device.ipAddress,
      action: 'assess_risk',
      description: `Risk score updated from ${oldRiskScore} to ${newRiskScore}`,
      details: {
        riskAssessment: {
          oldScore: oldRiskScore,
          newScore: newRiskScore,
          change: newRiskScore - oldRiskScore,
          factors: riskFactors,
          level: device.riskLevel,
        },
        device: {
          id: device.id,
          type: device.deviceType,
          status: device.status,
        },
        context,
      },
      outcome: 'success',
      riskScore: newRiskScore,
    };

    await this.storeAuditLog(entry);
  }

  async logAdminAction(
    adminId: string,
    action: string,
    target: {
      type: 'device' | 'user' | 'system';
      id: string;
    },
    description: string,
    context?: Record<string, any>,
  ): Promise<void> {
    const entry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      eventType: AuditEventType.ADMIN_ACTION,
      severity: 'info',
      source: 'admin-panel',
      userId: target.type === 'user' ? target.id : undefined,
      deviceId: target.type === 'device' ? target.id : undefined,
      action,
      description: `Admin action: ${description}`,
      details: {
        admin: {
          id: adminId,
          action,
        },
        target,
        context,
      },
      outcome: 'success',
    };

    await this.storeAuditLog(entry);
  }

  async queryAuditLogs(options: AuditQueryOptions = {}): Promise<{
    logs: AuditLogEntry[];
    total: number;
    hasMore: boolean;
  }> {
    let logs = Array.from(this.auditLogs.values());

    // Apply filters
    if (options.startDate) {
      logs = logs.filter((log) => log.timestamp >= options.startDate!);
    }

    if (options.endDate) {
      logs = logs.filter((log) => log.timestamp <= options.endDate!);
    }

    if (options.eventTypes?.length) {
      logs = logs.filter((log) => options.eventTypes!.includes(log.eventType));
    }

    if (options.severities?.length) {
      logs = logs.filter((log) => options.severities!.includes(log.severity));
    }

    if (options.userId) {
      logs = logs.filter((log) => log.userId === options.userId);
    }

    if (options.deviceId) {
      logs = logs.filter((log) => log.deviceId === options.deviceId);
    }

    if (options.ipAddress) {
      logs = logs.filter((log) => log.ipAddress === options.ipAddress);
    }

    if (options.outcome) {
      logs = logs.filter((log) => log.outcome === options.outcome);
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = logs.length;
    const offset = options.offset || 0;
    const limit = options.limit || 100;

    const paginatedLogs = logs.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      logs: paginatedLogs,
      total,
      hasMore,
    };
  }

  async getAuditStatistics(
    timeRange: { start: Date; end: Date } = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date(),
    },
  ): Promise<AuditStatistics> {
    const logs = Array.from(this.auditLogs.values()).filter(
      (log) =>
        log.timestamp >= timeRange.start && log.timestamp <= timeRange.end,
    );

    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};
    const eventsByOutcome: Record<string, number> = {};
    const userCounts: Record<string, number> = {};
    const deviceCounts: Record<string, number> = {};
    const ipCounts: Record<string, number> = {};

    logs.forEach((log) => {
      // Count by type
      eventsByType[log.eventType] = (eventsByType[log.eventType] || 0) + 1;

      // Count by severity
      eventsBySeverity[log.severity] =
        (eventsBySeverity[log.severity] || 0) + 1;

      // Count by outcome
      eventsByOutcome[log.outcome] = (eventsByOutcome[log.outcome] || 0) + 1;

      // Count by user
      if (log.userId) {
        userCounts[log.userId] = (userCounts[log.userId] || 0) + 1;
      }

      // Count by device
      if (log.deviceId) {
        deviceCounts[log.deviceId] = (deviceCounts[log.deviceId] || 0) + 1;
      }

      // Count by IP
      if (log.ipAddress) {
        ipCounts[log.ipAddress] = (ipCounts[log.ipAddress] || 0) + 1;
      }
    });

    // Get top items
    const topUsers = Object.entries(userCounts)
      .map(([userId, count]) => ({ userId, eventCount: count }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10);

    const topDevices = Object.entries(deviceCounts)
      .map(([deviceId, count]) => ({ deviceId, eventCount: count }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10);

    const topIPs = Object.entries(ipCounts)
      .map(([ipAddress, count]) => ({ ipAddress, eventCount: count }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10);

    // Get recent critical events
    const recentCriticalEvents = logs
      .filter((log) => log.severity === 'critical')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    // Generate timeline (daily counts)
    const timeline = this.generateTimeline(
      logs,
      timeRange.start,
      timeRange.end,
    );

    return {
      totalEvents: logs.length,
      eventsByType,
      eventsBySeverity,
      eventsByOutcome,
      topUsers,
      topDevices,
      topIPs,
      recentCriticalEvents,
      timeline,
    };
  }

  async exportAuditLogs(
    options: AuditQueryOptions = {},
    format: 'json' | 'csv' = 'json',
  ): Promise<string> {
    const { logs } = await this.queryAuditLogs(options);

    if (format === 'csv') {
      return this.convertToCsv(logs);
    }

    return JSON.stringify(logs, null, 2);
  }

  private async storeAuditLog(entry: AuditLogEntry): Promise<void> {
    // Store in memory (in production, you'd store in a database)
    this.auditLogs.set(entry.id, entry);

    // Enforce memory limits
    if (this.auditLogs.size > this.maxLogEntries) {
      const oldestEntries = Array.from(this.auditLogs.entries())
        .sort(([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime())
        .slice(0, Math.floor(this.maxLogEntries * 0.1)); // Remove oldest 10%

      oldestEntries.forEach(([id]) => this.auditLogs.delete(id));
    }

    // Log to console/file for debugging
    const logMessage = `[${entry.eventType}] ${entry.description}`;
    const logData = {
      id: entry.id,
      severity: entry.severity,
      outcome: entry.outcome,
      userId: entry.userId,
      deviceId: entry.deviceId,
      riskScore: entry.riskScore,
    };

    switch (entry.severity) {
      case 'critical':
        this.logger.error(logMessage, logData);
        break;
      case 'error':
        this.logger.error(logMessage, logData);
        break;
      case 'warning':
        this.logger.warn(logMessage, logData);
        break;
      default:
        this.logger.log(logMessage, logData);
    }
  }

  private generateTimeline(
    logs: AuditLogEntry[],
    startDate: Date,
    endDate: Date,
  ): Array<{ date: string; count: number }> {
    const timeline: Array<{ date: string; count: number }> = [];
    const dayMs = 24 * 60 * 60 * 1000;

    for (
      let date = new Date(startDate);
      date <= endDate;
      date.setTime(date.getTime() + dayMs)
    ) {
      const dayStart = new Date(date);
      const dayEnd = new Date(date.getTime() + dayMs - 1);

      const dayLogs = logs.filter(
        (log) => log.timestamp >= dayStart && log.timestamp <= dayEnd,
      );

      timeline.push({
        date: dayStart.toISOString().split('T')[0],
        count: dayLogs.length,
      });
    }

    return timeline;
  }

  private convertToCsv(logs: AuditLogEntry[]): string {
    const headers = [
      'ID',
      'Timestamp',
      'Event Type',
      'Severity',
      'Source',
      'User ID',
      'Device ID',
      'IP Address',
      'Action',
      'Description',
      'Outcome',
      'Risk Score',
    ];

    const rows = logs.map((log) => [
      log.id,
      log.timestamp.toISOString(),
      log.eventType,
      log.severity,
      log.source,
      log.userId || '',
      log.deviceId || '',
      log.ipAddress || '',
      log.action,
      log.description,
      log.outcome,
      log.riskScore?.toString() || '',
    ]);

    return [headers, ...rows]
      .map((row) => row.map((cell) => `\"${cell}\"`).join(','))
      .join('\n');
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Method to get audit trail for compliance
  async getComplianceReport(timeRange: { start: Date; end: Date }): Promise<{
    summary: {
      totalEvents: number;
      criticalEvents: number;
      securityViolations: number;
      blockedDevices: number;
      complianceScore: number;
    };
    detailedLogs: AuditLogEntry[];
    recommendations: string[];
  }> {
    const { logs } = await this.queryAuditLogs({
      startDate: timeRange.start,
      endDate: timeRange.end,
    });

    const criticalEvents = logs.filter(
      (log) => log.severity === 'critical',
    ).length;
    const securityViolations = logs.filter(
      (log) => log.eventType === AuditEventType.SECURITY_VIOLATION,
    ).length;
    const blockedDevices = logs.filter(
      (log) => log.eventType === AuditEventType.DEVICE_BLOCKED,
    ).length;

    // Calculate compliance score (0-100)
    const totalRiskEvents = criticalEvents + securityViolations;
    const complianceScore = Math.max(
      0,
      100 - (totalRiskEvents / logs.length) * 100,
    );

    const recommendations: string[] = [];
    if (criticalEvents > 10) {
      recommendations.push('Review and strengthen security policies');
    }
    if (securityViolations > 5) {
      recommendations.push('Implement additional security controls');
    }
    if (blockedDevices > 20) {
      recommendations.push('Review device blocking policies');
    }

    return {
      summary: {
        totalEvents: logs.length,
        criticalEvents,
        securityViolations,
        blockedDevices,
        complianceScore: Math.round(complianceScore),
      },
      detailedLogs: logs.filter(
        (log) =>
          log.severity === 'critical' ||
          log.eventType === AuditEventType.SECURITY_VIOLATION ||
          log.eventType === AuditEventType.DEVICE_BLOCKED,
      ),
      recommendations,
    };
  }
}
