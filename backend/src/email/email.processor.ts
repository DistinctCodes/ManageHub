import {
  Process,
  Processor,
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, DoneCallback } from 'bull';
import { EmailService } from './email.service';
import { SendEmailDto } from './dto/send-email.dto';

export interface EmailJobData {
  emailLogId: string;
  emailData: SendEmailDto;
}

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {}

  @Process('send-email')
  async handleSendEmail(job: Job<EmailJobData>): Promise<void> {
    const { emailLogId, emailData } = job.data;

    this.logger.log(`Processing email job ${job.id} for log ${emailLogId}`);

    try {
      await this.emailService.sendEmail(emailLogId, emailData);
      this.logger.log(`Email sent successfully: ${emailLogId}`);
    } catch (error) {
      this.logger.error(`Failed to send email ${emailLogId}:`, error);

      // If this is the last retry, move to dead letter queue
      if (job.attemptsMade >= job.opts.attempts) {
        this.logger.error(
          `Email ${emailLogId} moved to dead letter queue after ${job.attemptsMade} attempts`,
        );
      }

      throw error;
    }
  }

  @Process('bulk-send')
  async handleBulkSend(job: Job): Promise<void> {
    const { recipients, ...emailData } = job.data;

    this.logger.log(
      `Processing bulk email job ${job.id} with ${recipients.length} recipients`,
    );

    let successCount = 0;
    let failureCount = 0;

    for (const recipient of recipients) {
      try {
        await this.emailService.queueEmail({
          ...emailData,
          to: recipient.email,
          userId: recipient.userId,
          templateData: { ...emailData.templateData, ...recipient.customData },
        });
        successCount++;
      } catch (error) {
        this.logger.error(
          `Failed to queue email for ${recipient.email}:`,
          error,
        );
        failureCount++;
      }

      // Update job progress
      const progress =
        ((successCount + failureCount) / recipients.length) * 100;
      await job.progress(progress);
    }

    this.logger.log(
      `Bulk email job ${job.id} completed: ${successCount} success, ${failureCount} failed`,
    );
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`Job ${job.id} of type ${job.name} completed`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} of type ${job.name} failed with error:`,
      error,
    );

    // Check if job has exceeded max attempts
    if (job.attemptsMade >= job.opts.attempts) {
      this.logger.error(
        `Job ${job.id} has reached maximum retry attempts (${job.attemptsMade}/${job.opts.attempts})`,
      );
      // Job will be moved to failed set and can be retrieved from dead letter queue
    } else {
      this.logger.warn(
        `Job ${job.id} will be retried (attempt ${job.attemptsMade + 1}/${job.opts.attempts})`,
      );
    }
  }
}
