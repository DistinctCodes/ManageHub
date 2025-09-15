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
      this.logger.log(`Recovery notification sent for endpoint: ${endpoint.name}`);\n    }\n  }\n\n  private async handleFailedPing(\n    endpointId: string, \n    endpoint: ApiEndpoint, \n    pingResult: PingResult\n  ): Promise<void> {\n    const currentFailureCount = (this.failureCounters.get(endpointId) || 0) + 1;\n    this.failureCounters.set(endpointId, currentFailureCount);\n\n    const thresholdReached = currentFailureCount >= (endpoint.alertConfig.consecutiveFailures || 3);\n    const cooldownExpired = this.isCooldownExpired(endpointId);\n\n    if (thresholdReached && cooldownExpired) {\n      const severity = this.calculateSeverity(currentFailureCount, pingResult.status);\n      \n      const failureEvent: NotificationEvent = {\n        type: 'failure',\n        severity,\n        endpointId: endpoint.id,\n        endpointName: endpoint.name,\n        endpointUrl: endpoint.url,\n        message: `🚨 ${endpoint.name} is experiencing issues (${currentFailureCount} consecutive failures)`,\n        details: {\n          consecutiveFailures: currentFailureCount,\n          errorType: pingResult.status,\n          errorMessage: pingResult.errorMessage,\n          responseTime: pingResult.responseTimeMs,\n          httpStatusCode: pingResult.httpStatusCode,\n          attemptNumber: pingResult.attemptNumber,\n          lastSuccessAt: await this.getLastSuccessTime(endpointId),\n        },\n        timestamp: new Date(),\n        alertConfig: endpoint.alertConfig,\n      };\n\n      await this.sendNotification(failureEvent);\n      this.updateLastNotificationTime(endpointId);\n      \n      this.logger.warn(`Failure notification sent for endpoint: ${endpoint.name} (${currentFailureCount} failures)`);\n    }\n  }\n\n  private async checkSlowResponse(endpoint: ApiEndpoint, pingResult: PingResult): Promise<void> {\n    const responseTimeThreshold = endpoint.alertConfig?.responseTimeThresholdMs;\n    \n    if (!responseTimeThreshold || !pingResult.responseTimeMs) {\n      return;\n    }\n\n    if (pingResult.responseTimeMs > responseTimeThreshold) {\n      const slowResponseEvent: NotificationEvent = {\n        type: 'slow_response',\n        severity: 'low',\n        endpointId: endpoint.id,\n        endpointName: endpoint.name,\n        endpointUrl: endpoint.url,\n        message: `⚠️ ${endpoint.name} is responding slowly (${pingResult.responseTimeMs}ms > ${responseTimeThreshold}ms)`,\n        details: {\n          responseTime: pingResult.responseTimeMs,\n          threshold: responseTimeThreshold,\n          averageResponseTime: endpoint.averageResponseTime,\n        },\n        timestamp: new Date(),\n        alertConfig: endpoint.alertConfig,\n      };\n\n      // Only send slow response alerts with longer cooldown to avoid spam\n      if (this.isCooldownExpired(endpoint.id, 30 * 60 * 1000)) { // 30 minutes\n        await this.sendNotification(slowResponseEvent);\n        this.updateLastNotificationTime(endpoint.id);\n      }\n    }\n  }\n\n  private async checkEndpointHealth(endpoint: ApiEndpoint): Promise<void> {\n    const uptimePercentage = endpoint.uptimePercentage;\n    const alertConfig = endpoint.alertConfig;\n\n    // Check if uptime falls below threshold\n    if (alertConfig?.uptimeThreshold && uptimePercentage < alertConfig.uptimeThreshold) {\n      const downtimeEvent: NotificationEvent = {\n        type: 'downtime_alert',\n        severity: 'high',\n        endpointId: endpoint.id,\n        endpointName: endpoint.name,\n        endpointUrl: endpoint.url,\n        message: `📉 ${endpoint.name} uptime is below threshold (${uptimePercentage.toFixed(2)}% < ${alertConfig.uptimeThreshold}%)`,\n        details: {\n          currentUptime: uptimePercentage,\n          threshold: alertConfig.uptimeThreshold,\n          status: endpoint.currentStatus,\n        },\n        timestamp: new Date(),\n        alertConfig: endpoint.alertConfig,\n      };\n\n      if (this.isCooldownExpired(endpoint.id, 60 * 60 * 1000)) { // 1 hour\n        await this.sendNotification(downtimeEvent);\n        this.updateLastNotificationTime(endpoint.id);\n      }\n    }\n  }\n\n  private async sendNotification(event: NotificationEvent): Promise<void> {\n    const promises: Promise<void>[] = [];\n\n    // Send email notifications\n    if (event.alertConfig?.emailNotifications?.length > 0) {\n      promises.push(this.sendEmailNotification(event));\n    }\n\n    // Send Slack notifications\n    if (event.alertConfig?.slackWebhook) {\n      promises.push(this.sendSlackNotification(event));\n    }\n\n    // Send webhook notifications\n    if (event.alertConfig?.webhookUrl) {\n      promises.push(this.sendWebhookNotification(event));\n    }\n\n    // Execute all notifications concurrently\n    await Promise.allSettled(promises);\n  }\n\n  private async sendEmailNotification(event: NotificationEvent): Promise<void> {\n    try {\n      // TODO: Implement email sending logic (integrate with email service)\n      this.logger.log(`📧 Email notification would be sent: ${event.message}`);\n      \n      // Example implementation:\n      // await this.emailService.sendAlert({\n      //   to: event.alertConfig.emailNotifications,\n      //   subject: `API Monitor Alert: ${event.endpointName}`,\n      //   template: 'api-alert',\n      //   context: event,\n      // });\n      \n    } catch (error) {\n      this.logger.error(`Failed to send email notification: ${error.message}`);\n    }\n  }\n\n  private async sendSlackNotification(event: NotificationEvent): Promise<void> {\n    try {\n      const slackPayload = {\n        text: event.message,\n        attachments: [\n          {\n            color: this.getSeverityColor(event.severity),\n            fields: [\n              {\n                title: 'Endpoint',\n                value: `${event.endpointName} (${event.endpointUrl})`,\n                short: false,\n              },\n              {\n                title: 'Time',\n                value: event.timestamp.toISOString(),\n                short: true,\n              },\n              {\n                title: 'Type',\n                value: event.type.replace('_', ' ').toUpperCase(),\n                short: true,\n              },\n            ],\n          },\n        ],\n      };\n\n      // TODO: Implement actual Slack webhook call\n      this.logger.log(`💬 Slack notification would be sent: ${JSON.stringify(slackPayload)}`);\n      \n      // Example implementation:\n      // await axios.post(event.alertConfig.slackWebhook, slackPayload);\n      \n    } catch (error) {\n      this.logger.error(`Failed to send Slack notification: ${error.message}`);\n    }\n  }\n\n  private async sendWebhookNotification(event: NotificationEvent): Promise<void> {\n    try {\n      const webhookPayload = {\n        event: event.type,\n        severity: event.severity,\n        endpoint: {\n          id: event.endpointId,\n          name: event.endpointName,\n          url: event.endpointUrl,\n        },\n        message: event.message,\n        details: event.details,\n        timestamp: event.timestamp.toISOString(),\n      };\n\n      // TODO: Implement actual webhook call\n      this.logger.log(`🔗 Webhook notification would be sent: ${JSON.stringify(webhookPayload)}`);\n      \n      // Example implementation:\n      // await axios.post(event.alertConfig.webhookUrl, webhookPayload, {\n      //   headers: { 'Content-Type': 'application/json' },\n      //   timeout: 10000,\n      // });\n      \n    } catch (error) {\n      this.logger.error(`Failed to send webhook notification: ${error.message}`);\n    }\n  }\n\n  private calculateSeverity(\n    consecutiveFailures: number, \n    errorType: PingStatus\n  ): 'low' | 'medium' | 'high' | 'critical' {\n    // Critical errors\n    if (errorType === PingStatus.DNS_ERROR || consecutiveFailures >= 10) {\n      return 'critical';\n    }\n    \n    // High severity\n    if (consecutiveFailures >= 5 || errorType === PingStatus.TIMEOUT) {\n      return 'high';\n    }\n    \n    // Medium severity\n    if (consecutiveFailures >= 3 || errorType === PingStatus.CONNECTION_ERROR) {\n      return 'medium';\n    }\n    \n    return 'low';\n  }\n\n  private getSeverityColor(severity: string): string {\n    switch (severity) {\n      case 'critical': return '#ff0000'; // Red\n      case 'high': return '#ff8800'; // Orange\n      case 'medium': return '#ffcc00'; // Yellow\n      case 'low': return '#88cc00'; // Light green\n      default: return '#cccccc'; // Gray\n    }\n  }\n\n  private isCooldownExpired(endpointId: string, customCooldown?: number): boolean {\n    const lastNotification = this.lastNotificationTimes.get(endpointId);\n    if (!lastNotification) {\n      return true;\n    }\n\n    const cooldown = customCooldown || this.cooldownPeriodMs;\n    return Date.now() - lastNotification.getTime() > cooldown;\n  }\n\n  private updateLastNotificationTime(endpointId: string): void {\n    this.lastNotificationTimes.set(endpointId, new Date());\n  }\n\n  private calculateDownDuration(endpointId: string): string {\n    const firstFailureTime = this.lastNotificationTimes.get(endpointId);\n    if (!firstFailureTime) {\n      return 'Unknown';\n    }\n\n    const durationMs = Date.now() - firstFailureTime.getTime();\n    const minutes = Math.floor(durationMs / (60 * 1000));\n    const hours = Math.floor(minutes / 60);\n\n    if (hours > 0) {\n      return `${hours}h ${minutes % 60}m`;\n    }\n    return `${minutes}m`;\n  }\n\n  private async getLastSuccessTime(endpointId: string): Promise<Date | null> {\n    const lastSuccess = await this.pingResultRepository.findOne({\n      where: {\n        endpointId,\n        isSuccess: true,\n      },\n      order: { createdAt: 'DESC' },\n    });\n\n    return lastSuccess?.createdAt || null;\n  }\n\n  // Public methods for external use\n  async testNotification(endpointId: string, notificationType: string): Promise<void> {\n    const endpoint = await this.endpointRepository.findOne({ where: { id: endpointId } });\n    if (!endpoint) {\n      throw new Error('Endpoint not found');\n    }\n\n    const testEvent: NotificationEvent = {\n      type: 'failure',\n      severity: 'low',\n      endpointId: endpoint.id,\n      endpointName: endpoint.name,\n      endpointUrl: endpoint.url,\n      message: `🧪 Test notification for ${endpoint.name}`,\n      details: {\n        testType: notificationType,\n        triggeredBy: 'manual-test',\n      },\n      timestamp: new Date(),\n      alertConfig: endpoint.alertConfig,\n    };\n\n    await this.sendNotification(testEvent);\n    this.logger.log(`Test notification sent for endpoint: ${endpoint.name}`);\n  }\n\n  async getNotificationHistory(endpointId?: string, limit: number = 100): Promise<any[]> {\n    // TODO: Implement notification history storage and retrieval\n    // This would require a separate NotificationLog entity\n    this.logger.log(`Retrieving notification history (limit: ${limit})`);\n    return [];\n  }\n\n  async updateNotificationSettings(\n    endpointId: string, \n    settings: Partial<NotificationConfig>\n  ): Promise<void> {\n    const endpoint = await this.endpointRepository.findOne({ where: { id: endpointId } });\n    if (!endpoint) {\n      throw new Error('Endpoint not found');\n    }\n\n    // Update alert configuration\n    endpoint.alertConfig = {\n      ...endpoint.alertConfig,\n      ...settings,\n    };\n\n    await this.endpointRepository.save(endpoint);\n    this.logger.log(`Updated notification settings for endpoint: ${endpoint.name}`);\n  }\n\n  // Cleanup method to prevent memory leaks\n  cleanup(): void {\n    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago\n    \n    // Clean up old failure counters\n    for (const [endpointId, time] of this.lastNotificationTimes.entries()) {\n      if (time.getTime() < cutoffTime) {\n        this.lastNotificationTimes.delete(endpointId);\n        this.failureCounters.delete(endpointId);\n      }\n    }\n  }\n}", "original_text": "    }\n  }"}