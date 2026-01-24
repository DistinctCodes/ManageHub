import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { EmailService } from '../email/email.service';
import { EmailLog, EmailStatus } from '../email/entities/email-log.entity';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class EmailJobs {
  private readonly logger = new Logger(EmailJobs.name);

  constructor(
    private readonly emailService: EmailService,
    @InjectRepository(EmailLog)
    private emailLogRepository: Repository<EmailLog>,
    @InjectQueue('email') private emailQueue: Queue,
  ) {}

  /**
   * Retry failed emails
   * Runs every hour to retry emails that failed but haven't reached max retries
   */
  @Cron(CronExpression.EVERY_HOUR)
  async retryFailedEmails() {
    this.logger.log('Starting retry failed emails job');

    const failedEmails = await this.emailLogRepository.find({
      where: {
        status: EmailStatus.FAILED,
        retryCount: LessThan(3),
      },
      take: 100,
    });

    this.logger.log(`Found ${failedEmails.length} failed emails to retry`);

    for (const email of failedEmails) {
      try {
        await this.emailQueue.add(
          'send-email',
          {
            emailLogId: email.id,
            emailData: {
              to: email.to,
              subject: email.subject,
              htmlContent: email.htmlContent,
              textContent: email.textContent,
              emailType: email.emailType,
              userId: email.userId,
              metadata: email.metadata,
              attachments: email.attachments,
            },
          },
          {
            attempts: 3 - email.retryCount,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          },
        );

        this.logger.log(`Requeued failed email: ${email.id}`);
      } catch (error) {
        this.logger.error(`Failed to requeue email ${email.id}:`, error);
      }
    }

    this.logger.log('Retry failed emails job completed');
  }

  /**
   * Clean up old email logs
   * Runs daily at 2 AM to archive or delete old email logs
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldEmailLogs() {
    this.logger.log('Starting cleanup old email logs job');

    const retentionDays = 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      const result = await this.emailLogRepository.delete({
        createdAt: LessThan(cutoffDate),
        status: EmailStatus.SENT,
      });

      this.logger.log(`Deleted ${result.affected} old email logs`);
    } catch (error) {
      this.logger.error('Failed to clean up old email logs:', error);
    }

    this.logger.log('Cleanup old email logs job completed');
  }

  /**
   * Process dead letter queue
   * Runs every 6 hours to handle permanently failed emails
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async processDeadLetterQueue() {
    this.logger.log('Starting process dead letter queue job');

    try {
      const failedJobs = await this.emailQueue.getFailed();
      this.logger.log(`Found ${failedJobs.length} jobs in dead letter queue`);

      for (const job of failedJobs) {
        const { emailLogId } = job.data;
        
        // Log the permanent failure
        const emailLog = await this.emailLogRepository.findOne({
          where: { id: emailLogId },
        });

        if (emailLog) {
          emailLog.status = EmailStatus.FAILED;
          emailLog.errorMessage = `Permanently failed after ${job.attemptsMade} attempts. Last error: ${job.failedReason}`;
          await this.emailLogRepository.save(emailLog);
        }

        // Optionally send notification to admins about failed emails
        // this.notifyAdminsAboutFailedEmail(emailLog);

        // Remove from failed queue
        await job.remove();
      }

      this.logger.log('Process dead letter queue job completed');
    } catch (error) {
      this.logger.error('Failed to process dead letter queue:', error);
    }
  }

  /**
   * Send weekly summary emails
   * Runs every Monday at 9 AM
   */
  @Cron(CronExpression.EVERY_WEEK)
  async sendWeeklySummaryEmails() {
    this.logger.log('Starting weekly summary emails job');

    // This is a placeholder - implement based on your business logic
    // Example: Send attendance summaries, activity reports, etc.

    try {
      // Get users who have opted in for weekly summaries
      // const users = await this.getUsersOptedInForWeeklySummary();

      // for (const user of users) {
      //   await this.emailService.queueEmail({
      //     to: user.email,
      //     subject: 'Your Weekly Summary',
      //     templateName: 'check-in-summary',
      //     templateData: {
      //       username: user.firstname,
      //       period: 'this week',
      //       // Add summary data
      //     },
      //     emailType: EmailType.CHECK_IN_SUMMARY,
      //     userId: user.id,
      //   });
      // }

      this.logger.log('Weekly summary emails job completed');
    } catch (error) {
      this.logger.error('Failed to send weekly summary emails:', error);
    }
  }

  /**
   * Monitor email queue health
   * Runs every 15 minutes
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async monitorQueueHealth() {
    try {
      const waiting = await this.emailQueue.getWaitingCount();
      const active = await this.emailQueue.getActiveCount();
      const completed = await this.emailQueue.getCompletedCount();
      const failed = await this.emailQueue.getFailedCount();
      const delayed = await this.emailQueue.getDelayedCount();

      this.logger.log('Email Queue Health:', {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + delayed,
      });

      // Alert if queue is backing up
      if (waiting > 1000) {
        this.logger.warn(`Email queue is backing up: ${waiting} emails waiting`);
      }

      if (failed > 100) {
        this.logger.warn(`High number of failed emails: ${failed}`);
      }
    } catch (error) {
      this.logger.error('Failed to monitor queue health:', error);
    }
  }

  /**
   * Pause queue processing (for maintenance)
   */
  async pauseQueue() {
    await this.emailQueue.pause();
    this.logger.warn('Email queue paused');
  }

  /**
   * Resume queue processing
   */
  async resumeQueue() {
    await this.emailQueue.resume();
    this.logger.log('Email queue resumed');
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.emailQueue.getWaitingCount(),
      this.emailQueue.getActiveCount(),
      this.emailQueue.getCompletedCount(),
      this.emailQueue.getFailedCount(),
      this.emailQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed,
    };
  }

  /**
   * Clean completed jobs from queue
   */
  async cleanCompletedJobs() {
    const completed = await this.emailQueue.getCompleted();
    this.logger.log(`Cleaning ${completed.length} completed jobs from queue`);

    for (const job of completed) {
      await job.remove();
    }

    this.logger.log('Completed jobs cleaned');
  }
}
