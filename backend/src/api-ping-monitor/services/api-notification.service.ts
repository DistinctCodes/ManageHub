import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiEndpoint } from '../entities/api-endpoint.entity';
import { PingResult, PingStatus } from '../entities/ping-result.entity';

export interface NotificationConfig {
  emailEnabled: boolean;
  slackEnabled: boolean;
  webhookEnabled: boolean;
  smsEnabled: boolean;
  emailRecipients: string[];
  slackWebhook?: string;
  webhookUrl?: string;
  smsNumbers: string[];
}

export interface AlertCondition {
  consecutiveFailures: number;
  responseTimeThreshold: number;
  uptimeThreshold: number;
  errorRateThreshold: number;
}

export interface NotificationEvent {
  type: 'failure' | 'recovery' | 'slow_response' | 'high_error_rate' | 'downtime_alert';
  severity: 'low' | 'medium' | 'high' | 'critical';
  endpointId: string;
  endpointName: string;
  endpointUrl: string;
  message: string;
  details: any;
  timestamp: Date;
  alertConfig?: any;
}

@Injectable()
export class ApiNotificationService {
  private readonly logger = new Logger(ApiNotificationService.name);
  private failureCounters = new Map<string, number>();
  private lastNotificationTimes = new Map<string, Date>();
  private readonly cooldownPeriodMs = 15 * 60 * 1000; // 15 minutes

  constructor(
    @InjectRepository(ApiEndpoint)
    private endpointRepository: Repository<ApiEndpoint>,
    @InjectRepository(PingResult)
    private pingResultRepository: Repository<PingResult>,
  ) {}

  async handlePingResult(pingResult: PingResult, endpoint: ApiEndpoint): Promise<void> {
    try {
      if (!endpoint.enableAlerts || !endpoint.alertConfig) {
        return;
      }

      const endpointId = endpoint.id;
      
      if (pingResult.isSuccess) {
        await this.handleSuccessfulPing(endpointId, endpoint, pingResult);
      } else {
        await this.handleFailedPing(endpointId, endpoint, pingResult);
      }

      // Check for slow response times
      if (pingResult.isSuccess && pingResult.responseTimeMs) {
        await this.checkSlowResponse(endpoint, pingResult);
      }

      // Check overall endpoint health
      await this.checkEndpointHealth(endpoint);

    } catch (error) {
      this.logger.error(`Error handling ping result notification: ${error.message}`, error.stack);
    }
  }

  private async handleSuccessfulPing(
    endpointId: string, 
    endpoint: ApiEndpoint, 
    pingResult: PingResult
  ): Promise<void> {
    const previousFailureCount = this.failureCounters.get(endpointId) || 0;
    
    // Reset failure counter on success
    this.failureCounters.set(endpointId, 0);

    // Send recovery notification if we were in a failure state
    if (previousFailureCount >= (endpoint.alertConfig.consecutiveFailures || 3)) {
      const recoveryEvent: NotificationEvent = {
        type: 'recovery',
        severity: 'medium',
        endpointId: endpoint.id,
        endpointName: endpoint.name,
        endpointUrl: endpoint.url,
        message: `✅ ${endpoint.name} has recovered and is now responding successfully`,
        details: {
          previousFailureCount,
          responseTime: pingResult.responseTimeMs,
          recoveredAt: new Date(),
          downDuration: this.calculateDownDuration(endpointId),
        },
        timestamp: new Date(),
        alertConfig: endpoint.alertConfig,
      };

      await this.sendNotification(recoveryEvent);
      this.logger.log(`Recovery notification sent for endpoint: ${endpoint.name}`);
    }
  }

  private async handleFailedPing(
    endpointId: string, 
    endpoint: ApiEndpoint, 
    pingResult: PingResult
  ): Promise<void> {
    const currentFailureCount = (this.failureCounters.get(endpointId) || 0) + 1;
    this.failureCounters.set(endpointId, currentFailureCount);

    const thresholdReached = currentFailureCount >= (endpoint.alertConfig.consecutiveFailures || 3);
    const cooldownExpired = this.isCooldownExpired(endpointId);

    if (thresholdReached && cooldownExpired) {
      const severity = this.calculateSeverity(currentFailureCount, pingResult.status);
      
      const failureEvent: NotificationEvent = {
        type: 'failure',
        severity,
        endpointId: endpoint.id,
        endpointName: endpoint.name,
        endpointUrl: endpoint.url,
        message: `🚨 ${endpoint.name} is experiencing issues (${currentFailureCount} consecutive failures)`,
        details: {
          consecutiveFailures: currentFailureCount,
          errorType: pingResult.status,
          errorMessage: pingResult.errorMessage,
          responseTime: pingResult.responseTimeMs,
          httpStatusCode: pingResult.httpStatusCode,
          attemptNumber: pingResult.attemptNumber,
          lastSuccessAt: await this.getLastSuccessTime(endpointId),
        },
        timestamp: new Date(),
        alertConfig: endpoint.alertConfig,
      };

      await this.sendNotification(failureEvent);
      this.updateLastNotificationTime(endpointId);
      
      this.logger.warn(`Failure notification sent for endpoint: ${endpoint.name} (${currentFailureCount} failures)`);
    }
  }

  private async checkSlowResponse(endpoint: ApiEndpoint, pingResult: PingResult): Promise<void> {
    const responseTimeThreshold = endpoint.alertConfig?.responseTimeThresholdMs;
    
    if (!responseTimeThreshold || !pingResult.responseTimeMs) {
      return;
    }

    if (pingResult.responseTimeMs > responseTimeThreshold) {
      const slowResponseEvent: NotificationEvent = {
        type: 'slow_response',
        severity: 'low',
        endpointId: endpoint.id,
        endpointName: endpoint.name,
        endpointUrl: endpoint.url,
        message: `⚠️ ${endpoint.name} is responding slowly (${pingResult.responseTimeMs}ms > ${responseTimeThreshold}ms)`,
        details: {
          responseTime: pingResult.responseTimeMs,
          threshold: responseTimeThreshold,
          averageResponseTime: endpoint.averageResponseTime,
        },
        timestamp: new Date(),
        alertConfig: endpoint.alertConfig,
      };

      // Only send slow response alerts with longer cooldown to avoid spam
      if (this.isCooldownExpired(endpoint.id, 30 * 60 * 1000)) { // 30 minutes
        await this.sendNotification(slowResponseEvent);
        this.updateLastNotificationTime(endpoint.id);
      }
    }
  }

  private async checkEndpointHealth(endpoint: ApiEndpoint): Promise<void> {
    const uptimePercentage = endpoint.uptimePercentage;
    const alertConfig = endpoint.alertConfig;

    // Check if uptime falls below threshold
    if (alertConfig?.uptimeThreshold && uptimePercentage < alertConfig.uptimeThreshold) {
      const downtimeEvent: NotificationEvent = {
        type: 'downtime_alert',
        severity: 'high',
        endpointId: endpoint.id,
        endpointName: endpoint.name,
        endpointUrl: endpoint.url,
        message: `📉 ${endpoint.name} uptime is below threshold (${uptimePercentage.toFixed(2)}% < ${alertConfig.uptimeThreshold}%)`,
        details: {
          currentUptime: uptimePercentage,
          threshold: alertConfig.uptimeThreshold,
          status: endpoint.currentStatus,
        },
        timestamp: new Date(),
        alertConfig: endpoint.alertConfig,
      };

      if (this.isCooldownExpired(endpoint.id, 60 * 60 * 1000)) { // 1 hour
        await this.sendNotification(downtimeEvent);
        this.updateLastNotificationTime(endpoint.id);
      }
    }
  }

  private async sendNotification(event: NotificationEvent): Promise<void> {
    const promises: Promise<void>[] = [];

    // Send email notifications
    if (event.alertConfig?.emailNotifications?.length > 0) {
      promises.push(this.sendEmailNotification(event));
    }

    // Send Slack notifications
    if (event.alertConfig?.slackWebhook) {
      promises.push(this.sendSlackNotification(event));
    }

    // Send webhook notifications
    if (event.alertConfig?.webhookUrl) {
      promises.push(this.sendWebhookNotification(event));
    }

    // Execute all notifications concurrently
    await Promise.allSettled(promises);
  }

  private async sendEmailNotification(event: NotificationEvent): Promise<void> {
    try {
      // TODO: Implement email sending logic (integrate with email service)
      this.logger.log(`📧 Email notification would be sent: ${event.message}`);
      
      // Example implementation:
      // await this.emailService.sendAlert({
      //   to: event.alertConfig.emailNotifications,
      //   subject: `API Monitor Alert: ${event.endpointName}`,
      //   template: 'api-alert',
      //   context: event,
      // });
      
    } catch (error) {
      this.logger.error(`Failed to send email notification: ${error.message}`);
    }
  }

  private async sendSlackNotification(event: NotificationEvent): Promise<void> {
    try {
      const slackPayload = {
        text: event.message,
        attachments: [
          {
            color: this.getSeverityColor(event.severity),
            fields: [
              {
                title: 'Endpoint',
                value: `${event.endpointName} (${event.endpointUrl})`,
                short: false,
              },
              {
                title: 'Time',
                value: event.timestamp.toISOString(),
                short: true,
              },
              {
                title: 'Type',
                value: event.type.replace('_', ' ').toUpperCase(),
                short: true,
              },
            ],
          },
        ],
      };

      // TODO: Implement actual Slack webhook call
      this.logger.log(`💬 Slack notification would be sent: ${JSON.stringify(slackPayload)}`);
      
      // Example implementation:
      // await axios.post(event.alertConfig.slackWebhook, slackPayload);
      
    } catch (error) {
      this.logger.error(`Failed to send Slack notification: ${error.message}`);
    }
  }

  private async sendWebhookNotification(event: NotificationEvent): Promise<void> {
    try {
      const webhookPayload = {
        event: event.type,
        severity: event.severity,
        endpoint: {
          id: event.endpointId,
          name: event.endpointName,
          url: event.endpointUrl,
        },
        message: event.message,
        details: event.details,
        timestamp: event.timestamp.toISOString(),
      };

      // TODO: Implement actual webhook call
      this.logger.log(`🔗 Webhook notification would be sent: ${JSON.stringify(webhookPayload)}`);
      
      // Example implementation:
      // await axios.post(event.alertConfig.webhookUrl, webhookPayload, {
      //   headers: { 'Content-Type': 'application/json' },
      //   timeout: 10000,
      // });
      
    } catch (error) {
      this.logger.error(`Failed to send webhook notification: ${error.message}`);
    }
  }

  private calculateSeverity(
    consecutiveFailures: number, 
    errorType: PingStatus
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Critical errors
    if (errorType === PingStatus.DNS_ERROR || consecutiveFailures >= 10) {
      return 'critical';
    }
    
    // High severity
    if (consecutiveFailures >= 5 || errorType === PingStatus.TIMEOUT) {
      return 'high';
    }
    
    // Medium severity
    if (consecutiveFailures >= 3 || errorType === PingStatus.CONNECTION_ERROR) {
      return 'medium';
    }
    
    return 'low';
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return '#ff0000'; // Red
      case 'high': return '#ff8800'; // Orange
      case 'medium': return '#ffcc00'; // Yellow
      case 'low': return '#88cc00'; // Light green
      default: return '#cccccc'; // Gray
    }
  }

  private isCooldownExpired(endpointId: string, customCooldown?: number): boolean {
    const lastNotification = this.lastNotificationTimes.get(endpointId);
    if (!lastNotification) {
      return true;
    }

    const cooldown = customCooldown || this.cooldownPeriodMs;
    return Date.now() - lastNotification.getTime() > cooldown;
  }

  private updateLastNotificationTime(endpointId: string): void {
    this.lastNotificationTimes.set(endpointId, new Date());
  }

  private calculateDownDuration(endpointId: string): string {
    const firstFailureTime = this.lastNotificationTimes.get(endpointId);
    if (!firstFailureTime) {
      return 'Unknown';
    }

    const durationMs = Date.now() - firstFailureTime.getTime();
    const minutes = Math.floor(durationMs / (60 * 1000));
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  }

  private async getLastSuccessTime(endpointId: string): Promise<Date | null> {
    const lastSuccess = await this.pingResultRepository.findOne({
      where: {
        endpointId,
        isSuccess: true,
      },
      order: { createdAt: 'DESC' },
    });

    return lastSuccess?.createdAt || null;
  }

  // Public methods for external use
  async testNotification(endpointId: string, notificationType: string): Promise<void> {
    const endpoint = await this.endpointRepository.findOne({ where: { id: endpointId } });
    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    const testEvent: NotificationEvent = {
      type: 'failure',
      severity: 'low',
      endpointId: endpoint.id,
      endpointName: endpoint.name,
      endpointUrl: endpoint.url,
      message: `🧪 Test notification for ${endpoint.name}`,
      details: {
        testType: notificationType,
        triggeredBy: 'manual-test',
      },
      timestamp: new Date(),
      alertConfig: endpoint.alertConfig,
    };

    await this.sendNotification(testEvent);
    this.logger.log(`Test notification sent for endpoint: ${endpoint.name}`);
  }

  async getNotificationHistory(endpointId?: string, limit: number = 100): Promise<any[]> {
    // TODO: Implement notification history storage and retrieval
    // This would require a separate NotificationLog entity
    this.logger.log(`Retrieving notification history (limit: ${limit})`);
    return [];
  }

  async updateNotificationSettings(
    endpointId: string, 
    settings: Partial<NotificationConfig>
  ): Promise<void> {
    const endpoint = await this.endpointRepository.findOne({ where: { id: endpointId } });
    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    // Update alert configuration
    endpoint.alertConfig = {
      ...endpoint.alertConfig,
      ...settings,
    };

    await this.endpointRepository.save(endpoint);
    this.logger.log(`Updated notification settings for endpoint: ${endpoint.name}`);
  }

  // Cleanup method to prevent memory leaks
  cleanup(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    // Clean up old failure counters
    for (const [endpointId, time] of this.lastNotificationTimes.entries()) {
      if (time.getTime() < cutoffTime) {
        this.lastNotificationTimes.delete(endpointId);
        this.failureCounters.delete(endpointId);
      }
    }
  }
}