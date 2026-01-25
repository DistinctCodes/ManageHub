import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnalyticsService } from '../analytics/analytics.service';
import { PdfExporterService } from '../analytics/exporters/pdf-exporter.service';
import { ExcelExporterService } from '../analytics/exporters/excel-exporter.service';

@Injectable()
export class ScheduledReportsJob {
  private readonly logger = new Logger(ScheduledReportsJob.name);

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly pdfExporter: PdfExporterService,
    private readonly excelExporter: ExcelExporterService,
  ) {}

  /**
   * Generate and send daily analytics report
   * Runs every day at 8:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async generateDailyReport(): Promise<void> {
    this.logger.log('Starting daily analytics report generation...');

    try {
      // Get yesterday's date range
      const endDate = new Date();
      endDate.setHours(0, 0, 0, 0);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 1);

      const query = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        aggregation: 'daily' as const,
      };

      // Get dashboard stats
      const dashboardStats = await this.analyticsService.getDashboardStats(
        {},
        'admin',
      );

      // Get attendance analytics
      const attendanceStats =
        await this.analyticsService.getAttendanceAnalytics(query, 'admin');

      // Get member analytics
      const memberStats = await this.analyticsService.getMemberAnalytics(
        query,
        'admin',
      );

      this.logger.log('Daily report data gathered successfully');

      // Generate PDF report
      const reportBuffer = await this.pdfExporter.exportDashboardReport(
        dashboardStats.data,
        `Daily Analytics Report - ${startDate.toLocaleDateString()}`,
      );

      this.logger.log('Daily PDF report generated successfully');

      // TODO: Send email with report attachment
      // This would require the EmailService to support attachments
      // await this.emailService.sendReportEmail(recipients, reportBuffer);

      this.logger.log('Daily analytics report completed');
    } catch (error) {
      this.logger.error('Failed to generate daily report', error.stack);
    }
  }

  /**
   * Generate and send weekly analytics report
   * Runs every Monday at 8:00 AM
   */
  @Cron(CronExpression.EVERY_WEEK)
  async generateWeeklyReport(): Promise<void> {
    this.logger.log('Starting weekly analytics report generation...');

    try {
      // Get last week's date range
      const endDate = new Date();
      endDate.setHours(0, 0, 0, 0);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 7);

      const query = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        aggregation: 'daily' as const,
      };

      // Get all analytics data
      const [dashboard, attendance, revenue, members, occupancy] =
        await Promise.all([
          this.analyticsService.getDashboardStats({}, 'admin'),
          this.analyticsService.getAttendanceAnalytics(query, 'admin'),
          this.analyticsService.getRevenueAnalytics(query, 'admin'),
          this.analyticsService.getMemberAnalytics(query, 'admin'),
          this.analyticsService.getOccupancyAnalytics(query, 'admin'),
        ]);

      this.logger.log('Weekly report data gathered successfully');

      // Generate Excel report with all sheets
      const reportBuffer = await this.excelExporter.exportDashboardReport(
        {
          ...dashboard.data,
          attendanceTrends: attendance.data.trends.length,
          memberGrowthTrends: members.data.memberGrowth.length,
        },
        `Weekly Analytics Report - ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
      );

      this.logger.log('Weekly Excel report generated successfully');

      // TODO: Send email with report attachment
      // await this.emailService.sendReportEmail(recipients, reportBuffer);

      this.logger.log('Weekly analytics report completed');
    } catch (error) {
      this.logger.error('Failed to generate weekly report', error.stack);
    }
  }

  /**
   * Generate and send monthly analytics report
   * Runs on the 1st of every month at 8:00 AM
   */
  @Cron('0 8 1 * *')
  async generateMonthlyReport(): Promise<void> {
    this.logger.log('Starting monthly analytics report generation...');

    try {
      // Get last month's date range
      const endDate = new Date();
      endDate.setDate(1);
      endDate.setHours(0, 0, 0, 0);
      const startDate = new Date(endDate);
      startDate.setMonth(startDate.getMonth() - 1);

      const query = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: new Date(endDate.getTime() - 1).toISOString().split('T')[0],
        aggregation: 'daily' as const,
      };

      // Get all analytics data
      const [dashboard, attendance, revenue, members] = await Promise.all([
        this.analyticsService.getDashboardStats({}, 'admin'),
        this.analyticsService.getAttendanceAnalytics(query, 'admin'),
        this.analyticsService.getRevenueAnalytics(query, 'admin'),
        this.analyticsService.getMemberAnalytics(query, 'admin'),
      ]);

      this.logger.log('Monthly report data gathered successfully');

      // Generate comprehensive PDF report
      const dashboardReport = await this.pdfExporter.exportDashboardReport(
        dashboard.data,
        `Monthly Analytics Report - ${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      );

      this.logger.log('Monthly PDF report generated successfully');

      // TODO: Send email with report attachment
      // await this.emailService.sendReportEmail(recipients, dashboardReport);

      this.logger.log('Monthly analytics report completed');
    } catch (error) {
      this.logger.error('Failed to generate monthly report', error.stack);
    }
  }

  /**
   * Invalidate analytics cache
   * Runs every 5 minutes to ensure fresh data
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async refreshAnalyticsCache(): Promise<void> {
    try {
      await this.analyticsService.invalidateCache();
      this.logger.debug('Analytics cache refreshed');
    } catch (error) {
      this.logger.error('Failed to refresh analytics cache', error.stack);
    }
  }
}
