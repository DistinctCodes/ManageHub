import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EmailService } from '../email/email.service';

export const NPS_QUEUE = 'nps-survey';
export const NPS_SEND_JOB = 'send-survey';

export interface NpsSurveyJobData {
  bookingId: string;
  userEmail: string;
  userName: string;
  workspaceName: string;
  bookingDate: string;
  surveyUrl: string;
}

@Processor(NPS_QUEUE)
export class NpsSurveyProcessor {
  private readonly logger = new Logger(NpsSurveyProcessor.name);

  constructor(private readonly emailService: EmailService) {}

  @Process(NPS_SEND_JOB)
  async handleSendSurvey(job: Job<NpsSurveyJobData>): Promise<void> {
    const { userEmail, userName, workspaceName, bookingDate, surveyUrl, bookingId } =
      job.data;

    this.logger.log(`Sending NPS survey for booking ${bookingId} to ${userEmail}`);

    await this.emailService.sendNpsSurveyEmail(userEmail, userName, {
      workspaceName,
      bookingDate,
      surveyUrl,
    });
  }
}
