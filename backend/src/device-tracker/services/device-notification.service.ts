import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceTracker, RiskLevel, DeviceStatus } from '../entities/device-tracker.entity';
import { AnomalyDetectionResult, AnomalyType } from './device-anomaly-detection.service';

export interface NotificationEvent {
  id: string;
  type: NotificationType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  deviceId?: string;
  userId?: string;
  data?: Record<string, any>;
  createdAt: Date;
  read: boolean;
  acknowledged: boolean;
}

export enum NotificationType {
  DEVICE_BLOCKED = 'device_blocked',
  HIGH_RISK_DEVICE = 'high_risk_device',
  NEW_DEVICE_DETECTED = 'new_device_detected',
  SUSPICIOUS_LOCATION = 'suspicious_location',
  IMPOSSIBLE_TRAVEL = 'impossible_travel',
  MULTIPLE_FAILED_ATTEMPTS = 'multiple_failed_attempts',
  CONCURRENT_SESSIONS = 'concurrent_sessions',
  VPN_TOR_DETECTED = 'vpn_tor_detected',
  ANOMALY_DETECTED = 'anomaly_detected',
  DEVICE_COMPROMISED = 'device_compromised',
  SECURITY_ALERT = 'security_alert',
}

export interface NotificationRule {
  id: string;
  type: NotificationType;
  enabled: boolean;
  conditions: Record<string, any>;
  actions: NotificationAction[];
  cooldown: number; // minutes
}

export interface NotificationAction {
  type: 'email' | 'webhook' | 'internal' | 'sms';
  target: string;
  template?: string;
}

@Injectable()
export class DeviceNotificationService {
  private readonly logger = new Logger(DeviceNotificationService.name);
  private readonly notifications: Map<string, NotificationEvent> = new Map();
  private readonly lastNotificationTime: Map<string, number> = new Map();
  
  private readonly defaultRules: NotificationRule[] = [
    {
      id: 'device-blocked',
      type: NotificationType.DEVICE_BLOCKED,
      enabled: true,
      conditions: { status: DeviceStatus.BLOCKED },
      actions: [
        { type: 'internal', target: 'security-team' },
        { type: 'email', target: 'security@company.com' },
      ],
      cooldown: 0, // Immediate notification
    },
    {
      id: 'high-risk-device',
      type: NotificationType.HIGH_RISK_DEVICE,
      enabled: true,
      conditions: { riskLevel: RiskLevel.HIGH, riskScore: 70 },
      actions: [
        { type: 'internal', target: 'security-team' },
      ],
      cooldown: 60, // 1 hour cooldown
    },
    {
      id: 'new-device',
      type: NotificationType.NEW_DEVICE_DETECTED,
      enabled: true,
      conditions: { isNewDevice: true },
      actions: [
        { type: 'internal', target: 'user' },
        { type: 'email', target: 'user' },
      ],
      cooldown: 30, // 30 minutes cooldown
    },
    {
      id: 'impossible-travel',
      type: NotificationType.IMPOSSIBLE_TRAVEL,
      enabled: true,
      conditions: { anomalyType: AnomalyType.IMPOSSIBLE_TRAVEL },
      actions: [
        { type: 'internal', target: 'security-team' },
        { type: 'email', target: 'security@company.com' },
        { type: 'internal', target: 'user' },
      ],
      cooldown: 0, // Immediate notification
    },
    {
      id: 'vpn-tor-detected',
      type: NotificationType.VPN_TOR_DETECTED,
      enabled: true,
      conditions: { vpnTorUsage: true },
      actions: [
        { type: 'internal', target: 'security-team' },
      ],
      cooldown: 120, // 2 hours cooldown
    },
  ];

  constructor(
    @InjectRepository(DeviceTracker)
    private deviceTrackerRepository: Repository<DeviceTracker>,
  ) {}

  async notifyDeviceBlocked(device: DeviceTracker, reason: string): Promise<void> {
    const notification: NotificationEvent = {
      id: this.generateId(),
      type: NotificationType.DEVICE_BLOCKED,
      severity: 'critical',
      title: 'Device Blocked',
      message: `Device ${device.id} has been blocked. Reason: ${reason}`,
      deviceId: device.id,
      userId: device.userId,
      data: {
        device: {
          id: device.id,
          type: device.deviceType,
          ipAddress: device.ipAddress,
          location: device.location,
          riskScore: device.riskScore,
        },
        reason,
        blockedAt: device.blockedAt,
      },
      createdAt: new Date(),
      read: false,
      acknowledged: false,
    };

    await this.processNotification(notification);
  }

  async notifyHighRiskDevice(device: DeviceTracker): Promise<void> {
    const cooldownKey = `${NotificationType.HIGH_RISK_DEVICE}-${device.id}`;
    if (this.isInCooldown(cooldownKey, 60)) {
      return;
    }

    const notification: NotificationEvent = {
      id: this.generateId(),
      type: NotificationType.HIGH_RISK_DEVICE,
      severity: 'high',
      title: 'High Risk Device Detected',
      message: `Device ${device.id} has a high risk score of ${device.riskScore}`,
      deviceId: device.id,
      userId: device.userId,
      data: {
        device: {
          id: device.id,
          type: device.deviceType,
          ipAddress: device.ipAddress,
          location: device.location,
          riskScore: device.riskScore,
          riskLevel: device.riskLevel,
        },
      },
      createdAt: new Date(),
      read: false,
      acknowledged: false,
    };

    await this.processNotification(notification);
    this.setLastNotificationTime(cooldownKey);
  }

  async notifyNewDevice(device: DeviceTracker): Promise<void> {
    if (!device.userId) return;

    const cooldownKey = `${NotificationType.NEW_DEVICE_DETECTED}-${device.userId}`;
    if (this.isInCooldown(cooldownKey, 30)) {
      return;
    }

    const notification: NotificationEvent = {
      id: this.generateId(),
      type: NotificationType.NEW_DEVICE_DETECTED,
      severity: 'medium',
      title: 'New Device Detected',
      message: `A new device has been detected for your account`,
      deviceId: device.id,
      userId: device.userId,
      data: {
        device: {
          id: device.id,
          type: device.deviceType,
          ipAddress: device.ipAddress,
          location: device.location,
          userAgent: device.userAgent,
        },
        loginTime: device.createdAt,
      },
      createdAt: new Date(),
      read: false,
      acknowledged: false,
    };

    await this.processNotification(notification);
    this.setLastNotificationTime(cooldownKey);
  }

  async notifySuspiciousLocation(device: DeviceTracker): Promise<void> {
    const notification: NotificationEvent = {
      id: this.generateId(),
      type: NotificationType.SUSPICIOUS_LOCATION,
      severity: device.isTor ? 'critical' : device.isVpn ? 'high' : 'medium',
      title: 'Suspicious Location Access',
      message: `Access detected from ${device.isTor ? 'Tor network' : device.isVpn ? 'VPN' : 'suspicious location'}`,
      deviceId: device.id,
      userId: device.userId,
      data: {
        device: {
          id: device.id,
          location: device.location,
          country: device.countryName,
          ipAddress: device.ipAddress,
          isVpn: device.isVpn,
          isTor: device.isTor,
          isProxy: device.isProxy,
        },
      },
      createdAt: new Date(),
      read: false,
      acknowledged: false,
    };

    await this.processNotification(notification);
  }

  async notifyAnomaly(anomaly: AnomalyDetectionResult): Promise<void> {
    const notification: NotificationEvent = {
      id: this.generateId(),
      type: NotificationType.ANOMALY_DETECTED,
      severity: anomaly.severity,
      title: `Anomaly Detected: ${anomaly.anomalyType}`,
      message: anomaly.description,
      deviceId: anomaly.deviceId,
      data: {
        anomaly: {
          type: anomaly.anomalyType,
          riskScore: anomaly.riskScore,
          evidence: anomaly.evidence,
          recommendations: anomaly.recommendations,
        },
      },
      createdAt: new Date(),
      read: false,
      acknowledged: false,
    };

    await this.processNotification(notification);
  }

  async notifyMultipleFailedAttempts(device: DeviceTracker): Promise<void> {
    const cooldownKey = `${NotificationType.MULTIPLE_FAILED_ATTEMPTS}-${device.id}`;
    if (this.isInCooldown(cooldownKey, 15)) {
      return;
    }

    const notification: NotificationEvent = {
      id: this.generateId(),
      type: NotificationType.MULTIPLE_FAILED_ATTEMPTS,
      severity: device.failedAttempts > 10 ? 'high' : 'medium',
      title: 'Multiple Failed Login Attempts',
      message: `${device.failedAttempts} failed login attempts detected from device ${device.id}`,
      deviceId: device.id,
      userId: device.userId,
      data: {
        device: {
          id: device.id,
          ipAddress: device.ipAddress,
          location: device.location,
          failedAttempts: device.failedAttempts,
        },
      },
      createdAt: new Date(),
      read: false,
      acknowledged: false,
    };

    await this.processNotification(notification);
    this.setLastNotificationTime(cooldownKey);
  }

  async getNotifications(
    userId?: string,
    unreadOnly: boolean = false,
    limit: number = 50,
  ): Promise<NotificationEvent[]> {
    let notifications = Array.from(this.notifications.values());

    if (userId) {
      notifications = notifications.filter(n => n.userId === userId);
    }

    if (unreadOnly) {
      notifications = notifications.filter(n => !n.read);
    }

    return notifications
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  async markAsAcknowledged(notificationId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.acknowledged = true;
    }
  }

  async getNotificationStatistics(): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    recent: NotificationEvent[];
  }> {
    const notifications = Array.from(this.notifications.values());
    
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    let unread = 0;

    notifications.forEach(notification => {
      if (!notification.read) unread++;
      
      byType[notification.type] = (byType[notification.type] || 0) + 1;
      bySeverity[notification.severity] = (bySeverity[notification.severity] || 0) + 1;
    });

    const recent = notifications
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    return {
      total: notifications.length,
      unread,
      byType,
      bySeverity,
      recent,
    };
  }

  private async processNotification(notification: NotificationEvent): Promise<void> {
    // Store notification
    this.notifications.set(notification.id, notification);

    // Find applicable rules
    const rule = this.defaultRules.find(r => r.type === notification.type && r.enabled);
    if (rule) {
      await this.executeNotificationActions(notification, rule.actions);
    }

    // Log notification
    this.logger.log(
      `Notification created: ${notification.type} - ${notification.title}`,
      {
        id: notification.id,
        severity: notification.severity,
        deviceId: notification.deviceId,
        userId: notification.userId,
      },
    );
  }

  private async executeNotificationActions(
    notification: NotificationEvent,
    actions: NotificationAction[],
  ): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'email':
            await this.sendEmailNotification(notification, action.target);
            break;
          case 'webhook':
            await this.sendWebhookNotification(notification, action.target);
            break;
          case 'sms':
            await this.sendSmsNotification(notification, action.target);
            break;
          case 'internal':
          default:
            // Already stored in memory
            break;
        }
      } catch (error) {
        this.logger.error(
          `Failed to execute notification action ${action.type}:`,
          error,
        );
      }
    }
  }

  private async sendEmailNotification(
    notification: NotificationEvent,
    target: string,
  ): Promise<void> {
    // In a real implementation, you would integrate with an email service
    // like SendGrid, AWS SES, or Nodemailer
    this.logger.log(
      `Email notification sent to ${target}: ${notification.title}`,
    );
  }

  private async sendWebhookNotification(
    notification: NotificationEvent,
    webhookUrl: string,
  ): Promise<void> {
    // In a real implementation, you would make HTTP POST to webhook URL
    this.logger.log(
      `Webhook notification sent to ${webhookUrl}: ${notification.title}`,
    );
  }

  private async sendSmsNotification(
    notification: NotificationEvent,
    phoneNumber: string,
  ): Promise<void> {
    // In a real implementation, you would integrate with SMS service
    // like Twilio, AWS SNS, or similar
    this.logger.log(
      `SMS notification sent to ${phoneNumber}: ${notification.title}`,
    );
  }

  private isInCooldown(key: string, cooldownMinutes: number): boolean {
    const lastTime = this.lastNotificationTime.get(key);
    if (!lastTime) return false;

    const cooldownMs = cooldownMinutes * 60 * 1000;
    return Date.now() - lastTime < cooldownMs;
  }

  private setLastNotificationTime(key: string): void {
    this.lastNotificationTime.set(key, Date.now());
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Cleanup old notifications (run periodically)
  async cleanupOldNotifications(daysToKeep: number = 30): Promise<number> {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    for (const [id, notification] of this.notifications.entries()) {
      if (notification.createdAt.getTime() < cutoffTime) {
        this.notifications.delete(id);
        deletedCount++;
      }
    }

    this.logger.log(`Cleaned up ${deletedCount} old notifications`);
    return deletedCount;
  }
}