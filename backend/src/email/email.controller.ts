import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Param,
  Patch,
  UseGuards,
  Req,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { EmailService } from './email.service';
import { SendEmailDto } from './dto/send-email.dto';
import { BulkEmailDto } from './dto/bulk-email.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Public } from '../auth/decorators/public.decorator';
import { EmailPreference } from './entities/email-preference.entity';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  @UseGuards(JwtAuthGuard)
  async sendEmail(@Body() sendEmailDto: SendEmailDto) {
    const emailLog = await this.emailService.queueEmail(sendEmailDto);
    return {
      success: true,
      message: 'Email queued successfully',
      emailLogId: emailLog.id,
    };
  }

  @Post('bulk-send')
  @UseGuards(JwtAuthGuard)
  async sendBulkEmails(@Body() bulkEmailDto: BulkEmailDto) {
    await this.emailService.sendBulkEmails(bulkEmailDto);
    return {
      success: true,
      message: `Bulk email queued for ${bulkEmailDto.recipients.length} recipients`,
    };
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard)
  async getEmailAnalytics(
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const stats = await this.emailService.getEmailAnalytics(
      userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
    return stats;
  }

  @Get('preferences/:userId')
  @UseGuards(JwtAuthGuard)
  async getEmailPreferences(@Param('userId') userId: string) {
    const preferences = await this.emailService[
      'emailPreferenceRepository'
    ].findOne({
      where: { userId },
    });
    return preferences || { userId, unsubscribedFromAll: false };
  }

  @Patch('preferences/:userId')
  @UseGuards(JwtAuthGuard)
  async updateEmailPreferences(
    @Param('userId') userId: string,
    @Body() preferences: Partial<EmailPreference>,
  ) {
    const updated = await this.emailService.updateEmailPreferences(
      userId,
      preferences,
    );
    return {
      success: true,
      preferences: updated,
    };
  }

  @Post('unsubscribe')
  @Public()
  async unsubscribe(@Body('token') token: string) {
    if (!token) {
      throw new BadRequestException('Token is required');
    }
    await this.emailService.unsubscribe(token);
    return {
      success: true,
      message: 'Successfully unsubscribed from all emails',
    };
  }

  // Webhook handlers for email providers

  @Post('webhook/sendgrid')
  @Public()
  async handleSendGridWebhook(
    @Body() events: any[],
    @Headers('x-twilio-email-event-webhook-signature') signature: string,
  ) {
    // Verify webhook signature for security
    // Implementation depends on SendGrid's signature verification

    for (const event of events) {
      const emailLogId = event.email_log_id;

      switch (event.event) {
        case 'delivered':
          await this.emailService.trackEmailEvent(
            emailLogId,
            'delivered',
            event,
          );
          break;
        case 'open':
          await this.emailService.trackEmailEvent(emailLogId, 'opened', event);
          break;
        case 'click':
          await this.emailService.trackEmailEvent(emailLogId, 'clicked', event);
          break;
        case 'bounce':
          await this.emailService.trackEmailEvent(emailLogId, 'bounced', event);
          break;
        case 'spamreport':
          await this.emailService.trackEmailEvent(
            emailLogId,
            'complained',
            event,
          );
          break;
      }
    }

    return { success: true };
  }

  @Post('webhook/ses')
  @Public()
  async handleSESWebhook(@Body() notification: any) {
    // AWS SES SNS notification handler
    const message = JSON.parse(notification.Message);

    if (message.eventType) {
      const emailLogId = message.mail?.headers?.find(
        (h: any) => h.name === 'X-Email-Log-Id',
      )?.value;

      if (emailLogId) {
        switch (message.eventType) {
          case 'Delivery':
            await this.emailService.trackEmailEvent(
              emailLogId,
              'delivered',
              message,
            );
            break;
          case 'Open':
            await this.emailService.trackEmailEvent(
              emailLogId,
              'opened',
              message,
            );
            break;
          case 'Click':
            await this.emailService.trackEmailEvent(
              emailLogId,
              'clicked',
              message,
            );
            break;
          case 'Bounce':
            await this.emailService.trackEmailEvent(
              emailLogId,
              'bounced',
              message,
            );
            break;
          case 'Complaint':
            await this.emailService.trackEmailEvent(
              emailLogId,
              'complained',
              message,
            );
            break;
        }
      }
    }

    return { success: true };
  }

  @Post('webhook/mailgun')
  @Public()
  async handleMailgunWebhook(
    @Body('event-data') eventData: any,
    @Headers('x-mailgun-signature-timestamp') timestamp: string,
    @Headers('x-mailgun-signature-token') token: string,
    @Headers('x-mailgun-signature-signature') signature: string,
  ) {
    // Verify Mailgun webhook signature
    // Implementation depends on Mailgun's signature verification

    const emailLogId = eventData?.['user-variables']?.['email-log-id'];

    if (emailLogId) {
      switch (eventData.event) {
        case 'delivered':
          await this.emailService.trackEmailEvent(
            emailLogId,
            'delivered',
            eventData,
          );
          break;
        case 'opened':
          await this.emailService.trackEmailEvent(
            emailLogId,
            'opened',
            eventData,
          );
          break;
        case 'clicked':
          await this.emailService.trackEmailEvent(
            emailLogId,
            'clicked',
            eventData,
          );
          break;
        case 'bounced':
          await this.emailService.trackEmailEvent(
            emailLogId,
            'bounced',
            eventData,
          );
          break;
        case 'complained':
          await this.emailService.trackEmailEvent(
            emailLogId,
            'complained',
            eventData,
          );
          break;
      }
    }

    return { success: true };
  }

  // Tracking pixel endpoint
  @Get('track/open/:emailLogId')
  @Public()
  async trackEmailOpen(
    @Param('emailLogId') emailLogId: string,
    @Req() req: Request,
    @Headers('user-agent') userAgent: string,
  ) {
    const ipAddress =
      req.headers['x-forwarded-for'] || req.headers['x-real-ip'];

    await this.emailService.trackEmailEvent(emailLogId, 'opened', {
      ipAddress,
      userAgent,
    });

    // Return a 1x1 transparent pixel
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64',
    );

    return pixel;
  }

  // Link tracking endpoint
  @Get('track/click/:emailLogId')
  @Public()
  async trackEmailClick(
    @Param('emailLogId') emailLogId: string,
    @Query('url') targetUrl: string,
    @Req() req: Request,
    @Headers('user-agent') userAgent: string,
  ) {
    const ipAddress =
      req.headers['x-forwarded-for'] || req.headers['x-real-ip'];

    await this.emailService.trackEmailEvent(emailLogId, 'clicked', {
      ipAddress,
      userAgent,
      targetUrl,
    });

    // Redirect to the target URL
    return { redirect: targetUrl };
  }
}
