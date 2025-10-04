// src/scheduled-jobs/scheduled-jobs.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';
import { SettingsService } from '../settings/settings.service';
import { NotificationService } from '../notifications/notification.service'; 

@Injectable()
export class ScheduledJobsService {
  private readonly logger = new Logger(ScheduledJobsService.name);

  constructor(
    private readonly settingsService: SettingsService, 
    private readonly notificationService: NotificationService, 
  ) {}

  //Run every day at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkLicenseExpiry() {
    this.logger.log('Running license expiry check...');
    const expiredLicenses = await this.findExpiringLicenses();
    await this.notifyUsers(expiredLicenses, 'Your license will expire soon.');
  }

  // Run every Monday at 9 AM
  @Cron(CronExpression.EVERY_WEEK)
  async sendMaintenanceReminders() {
    this.logger.log('Running maintenance reminder job...');
    const vehicles = await this.findVehiclesNeedingMaintenance();
    await this.notifyUsers(vehicles, 'Maintenance is due soon.');
  }

  //Example of dynamic interval using settings
  @Interval(1000 * 60 * 10) // fallback 10 min interval
  async insuranceCheck() {
    const interval = await this.settingsService.get('insuranceReminderInterval');
    if (interval) {
      this.logger.log(`Running insurance check every ${interval} minutes...`);
    }
    const expiringInsurances = await this.findExpiringInsurances();
    await this.notifyUsers(expiringInsurances, 'Your insurance is expiring soon.');
  }

  // Dummy methods to simulate logic
  private async findExpiringLicenses() { return []; }
  private async findVehiclesNeedingMaintenance() { return []; }
  private async findExpiringInsurances() { return []; }

  private async notifyUsers(items: any[], message: string) {
    for (const item of items) {
      await this.notificationService.send(item.userId, message);
    }
  }
}
