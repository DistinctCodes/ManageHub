import {
  Injectable,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import * as handlebars from 'handlebars';
import * as mjml from 'mjml';
import * as fs from 'fs';
import * as path from 'path';
import { EmailLog, EmailStatus, EmailType } from './entities/email-log.entity';
import { EmailPreference } from './entities/email-preference.entity';
import { SendEmailDto } from './dto/send-email.dto';
import { BulkEmailDto } from './dto/bulk-email.dto';
import * as crypto from 'crypto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private templates: Map<string, handlebars.TemplateDelegate> = new Map();
  private readonly RATE_LIMIT_PER_HOUR = 100;
  private readonly RATE_LIMIT_WINDOW = 3600000; // 1 hour in ms

  constructor(
    private configService: ConfigService,
    @InjectRepository(EmailLog)
    private emailLogRepository: Repository<EmailLog>,
    @InjectRepository(EmailPreference)
    private emailPreferenceRepository: Repository<EmailPreference>,
    @InjectQueue('email') private emailQueue: Queue,
  ) {
    this.initializeTransporter();
    this.loadTemplates();
  }

  private initializeTransporter() {
    const nodeEnv = this.configService.get<string>('NODE_ENV');

    if (
      nodeEnv === 'development' &&
      this.configService.get<string>('MAILTRAP_HOST')
    ) {
      // Use Mailtrap for development
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('MAILTRAP_HOST'),
        port: this.configService.get<number>('MAILTRAP_PORT'),
        auth: {
          user: this.configService.get<string>('MAILTRAP_USER'),
          pass: this.configService.get<string>('MAILTRAP_PASS'),
        },
      });
      this.logger.log(
        'Email transporter initialized with Mailtrap for development',
      );
    } else {
      // Production SMTP
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('SMTP_HOST'),
        port: this.configService.get<number>('SMTP_PORT'),
        secure: this.configService.get<boolean>('SMTP_SECURE'),
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });
      this.logger.log('Email transporter initialized with production SMTP');
    }
  }

  private loadTemplates() {
    const templatesDir = path.join(__dirname, 'templates');
    const templateFiles = [
      'welcome.hbs',
      'verify-email.hbs',
      'reset-password.hbs',
      'password-changed.hbs',
      'two-factor-enabled.hbs',
      'payment-receipt.hbs',
      'check-in-summary.hbs',
      'account-deactivated.hbs',
    ];

    templateFiles.forEach((file) => {
      try {
        const templatePath = path.join(templatesDir, file);
        const templateSource = fs.readFileSync(templatePath, 'utf-8');
        const templateName = file.replace('.hbs', '');
        this.templates.set(templateName, handlebars.compile(templateSource));
        this.logger.log(`Loaded template: ${templateName}`);
      } catch (error) {
        this.logger.error(`Failed to load template ${file}:`, error);
      }
    });
  }

  async queueEmail(emailData: SendEmailDto): Promise<EmailLog> {
    // Check rate limiting
    if (emailData.userId) {
      await this.checkRateLimit(emailData.userId);
    }

    // Check user preferences
    if (emailData.userId && emailData.emailType) {
      const canSend = await this.checkEmailPreferences(
        emailData.userId,
        emailData.emailType,
      );
      if (!canSend) {
        throw new BadRequestException('User has opted out of this email type');
      }
    }

    // Create email log
    const emailLog = this.emailLogRepository.create({
      to: emailData.to,
      subject: emailData.subject,
      htmlContent: emailData.htmlContent,
      textContent: emailData.textContent,
      emailType: emailData.emailType || EmailType.TRANSACTIONAL,
      status: EmailStatus.QUEUED,
      userId: emailData.userId,
      metadata: emailData.metadata,
      attachments: emailData.attachments,
    });

    const savedLog = await this.emailLogRepository.save(emailLog);

    // Add to queue
    await this.emailQueue.add(
      'send-email',
      {
        emailLogId: savedLog.id,
        emailData,
      },
      {
        priority: emailData.priority || 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: false,
        removeOnFail: false,
      },
    );

    this.logger.log(`Email queued: ${savedLog.id}`);
    return savedLog;
  }

  async sendEmail(emailLogId: string, emailData: SendEmailDto): Promise<void> {
    const emailLog = await this.emailLogRepository.findOne({
      where: { id: emailLogId },
    });

    if (!emailLog) {
      throw new Error(`Email log not found: ${emailLogId}`);
    }

    try {
      // Update status to sending
      emailLog.status = EmailStatus.SENDING;
      await this.emailLogRepository.save(emailLog);

      let htmlContent = emailData.htmlContent;
      const textContent = emailData.textContent;

      // Render template if provided
      if (emailData.templateName) {
        htmlContent = await this.renderTemplate(
          emailData.templateName,
          emailData.templateData || {},
          emailData.userId,
        );
      }

      const companyName =
        this.configService.get<string>('COMPANY_NAME') || 'ManageHub';
      const fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL');

      const mailOptions: nodemailer.SendMailOptions = {
        from: `"${companyName}" <${fromEmail}>`,
        to: emailData.to,
        subject: emailData.subject,
        html: htmlContent,
        text: textContent,
        attachments: emailData.attachments,
        headers: {
          'X-Email-Log-Id': emailLogId,
        },
      };

      const info = await this.transporter.sendMail(mailOptions);

      // Update email log
      emailLog.status = EmailStatus.SENT;
      emailLog.sentAt = new Date();
      emailLog.messageId = info.messageId;
      emailLog.providerMessageId = info.messageId;
      emailLog.providerResponse = JSON.stringify(info);
      emailLog.htmlContent = htmlContent;
      emailLog.textContent = textContent;

      await this.emailLogRepository.save(emailLog);

      this.logger.log(`Email sent successfully: ${emailLogId}`);
    } catch (error) {
      // Update email log with error
      emailLog.status = EmailStatus.FAILED;
      emailLog.failedAt = new Date();
      emailLog.errorMessage = error.message;
      emailLog.retryCount += 1;

      await this.emailLogRepository.save(emailLog);

      this.logger.error(`Failed to send email ${emailLogId}:`, error);
      throw error;
    }
  }

  async renderTemplate(
    templateName: string,
    data: Record<string, any>,
    userId?: string,
  ): Promise<string> {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    // Add common variables
    const templateData: Record<string, any> = {
      ...data,
      companyName:
        this.configService.get<string>('COMPANY_NAME') || 'ManageHub',
      supportEmail: this.configService.get<string>('SUPPORT_EMAIL'),
      frontendUrl: this.configService.get<string>('FRONTEND_URL'),
      year: new Date().getFullYear(),
    };

    // Add unsubscribe link if userId provided
    if (userId) {
      const unsubscribeToken = await this.generateUnsubscribeToken(userId);
      templateData.unsubscribeUrl = `${templateData.frontendUrl}/unsubscribe?token=${unsubscribeToken}`;
      templateData.preferencesUrl = `${templateData.frontendUrl}/email-preferences`;
    }

    // Compile MJML template
    const mjmlString = template(templateData);
    const { html, errors } = mjml(mjmlString);

    if (errors && errors.length > 0) {
      this.logger.error('MJML compilation errors:', errors);
    }

    return html;
  }

  async sendBulkEmails(bulkEmailDto: BulkEmailDto): Promise<void> {
    const batchSize = bulkEmailDto.batchSize || 50;
    const delay = bulkEmailDto.delayBetweenBatches || 1000;

    for (let i = 0; i < bulkEmailDto.recipients.length; i += batchSize) {
      const batch = bulkEmailDto.recipients.slice(i, i + batchSize);

      for (const recipient of batch) {
        const emailData: SendEmailDto = {
          to: recipient.email,
          subject: bulkEmailDto.subject,
          templateName: bulkEmailDto.templateName,
          templateData: {
            ...bulkEmailDto.templateData,
            ...recipient.customData,
          },
          htmlContent: bulkEmailDto.htmlContent,
          textContent: bulkEmailDto.textContent,
          emailType: bulkEmailDto.emailType || EmailType.MARKETING,
          userId: recipient.userId,
          metadata: bulkEmailDto.metadata,
          priority: 3,
        };

        await this.queueEmail(emailData);
      }

      // Delay between batches
      if (i + batchSize < bulkEmailDto.recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    this.logger.log(
      `Bulk email queued: ${bulkEmailDto.recipients.length} recipients`,
    );
  }

  async checkRateLimit(userId: string): Promise<void> {
    const oneHourAgo = new Date(Date.now() - this.RATE_LIMIT_WINDOW);

    const count = await this.emailLogRepository.count({
      where: {
        userId,
        createdAt: MoreThan(oneHourAgo),
      },
    });

    if (count >= this.RATE_LIMIT_PER_HOUR) {
      throw new BadRequestException(
        `Rate limit exceeded. Maximum ${this.RATE_LIMIT_PER_HOUR} emails per hour.`,
      );
    }
  }

  async checkEmailPreferences(
    userId: string,
    emailType: EmailType,
  ): Promise<boolean> {
    const preferences = await this.emailPreferenceRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      return true; // Default to allowing emails if no preferences set
    }

    if (preferences.unsubscribedFromAll) {
      return false;
    }

    // Map email types to preference fields
    const typeToPreferenceMap = {
      [EmailType.MARKETING]: preferences.enableMarketingEmails,
      [EmailType.TRANSACTIONAL]: preferences.enableTransactionalEmails,
      [EmailType.ADMIN_NOTIFICATION]: preferences.enableNotificationEmails,
      [EmailType.PASSWORD_RESET]: preferences.enableSecurityEmails,
      [EmailType.PASSWORD_CHANGED]: preferences.enableSecurityEmails,
      [EmailType.TWO_FACTOR_ENABLED]: preferences.enableSecurityEmails,
      [EmailType.EMAIL_VERIFICATION]: preferences.enableTransactionalEmails,
      [EmailType.WELCOME]: preferences.enableTransactionalEmails,
      [EmailType.PAYMENT_RECEIPT]: preferences.enableTransactionalEmails,
      [EmailType.CHECK_IN_SUMMARY]: preferences.enableWeeklySummary,
      [EmailType.ACCOUNT_DEACTIVATED]: preferences.enableTransactionalEmails,
    };

    return typeToPreferenceMap[emailType] !== false;
  }

  async generateUnsubscribeToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');

    await this.emailPreferenceRepository.upsert(
      {
        userId,
        unsubscribeToken: token,
      },
      ['userId'],
    );

    return token;
  }

  async unsubscribe(token: string): Promise<void> {
    const preference = await this.emailPreferenceRepository.findOne({
      where: { unsubscribeToken: token },
    });

    if (!preference) {
      throw new BadRequestException('Invalid unsubscribe token');
    }

    preference.unsubscribedFromAll = true;
    preference.unsubscribedAt = new Date();
    await this.emailPreferenceRepository.save(preference);

    this.logger.log(`User unsubscribed: ${preference.userId}`);
  }

  async updateEmailPreferences(
    userId: string,
    preferences: Partial<EmailPreference>,
  ): Promise<EmailPreference> {
    const existingPreference = await this.emailPreferenceRepository.findOne({
      where: { userId },
    });

    if (existingPreference) {
      Object.assign(existingPreference, preferences);
      return await this.emailPreferenceRepository.save(existingPreference);
    } else {
      const newPreference = this.emailPreferenceRepository.create({
        userId,
        ...preferences,
      });
      return await this.emailPreferenceRepository.save(newPreference);
    }
  }

  async trackEmailEvent(
    emailLogId: string,
    event: 'opened' | 'clicked' | 'delivered' | 'bounced' | 'complained',
    metadata?: Record<string, any>,
  ): Promise<void> {
    const emailLog = await this.emailLogRepository.findOne({
      where: { id: emailLogId },
    });

    if (!emailLog) {
      throw new Error(`Email log not found: ${emailLogId}`);
    }

    const now = new Date();

    switch (event) {
      case 'opened':
        emailLog.status = EmailStatus.OPENED;
        emailLog.openedAt = emailLog.openedAt || now;
        emailLog.openCount += 1;
        break;
      case 'clicked':
        emailLog.status = EmailStatus.CLICKED;
        emailLog.clickedAt = emailLog.clickedAt || now;
        emailLog.clickCount += 1;
        break;
      case 'delivered':
        emailLog.status = EmailStatus.DELIVERED;
        emailLog.deliveredAt = now;
        break;
      case 'bounced':
        emailLog.status = EmailStatus.BOUNCED;
        emailLog.bouncedAt = now;
        break;
      case 'complained':
        emailLog.status = EmailStatus.COMPLAINED;
        break;
    }

    if (metadata) {
      emailLog.ipAddress = metadata.ipAddress;
      emailLog.userAgent = metadata.userAgent;
      emailLog.metadata = { ...emailLog.metadata, ...metadata };
    }

    await this.emailLogRepository.save(emailLog);
    this.logger.log(`Email event tracked: ${event} for ${emailLogId}`);
  }

  async getEmailAnalytics(userId?: string, startDate?: Date, endDate?: Date) {
    const queryBuilder = this.emailLogRepository.createQueryBuilder('email');

    if (userId) {
      queryBuilder.where('email.userId = :userId', { userId });
    }

    if (startDate) {
      queryBuilder.andWhere('email.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('email.createdAt <= :endDate', { endDate });
    }

    const [emails, total] = await queryBuilder.getManyAndCount();

    const stats = {
      total,
      sent: emails.filter((e) => e.status === EmailStatus.SENT).length,
      delivered: emails.filter((e) => e.status === EmailStatus.DELIVERED)
        .length,
      opened: emails.filter((e) => e.status === EmailStatus.OPENED).length,
      clicked: emails.filter((e) => e.status === EmailStatus.CLICKED).length,
      failed: emails.filter((e) => e.status === EmailStatus.FAILED).length,
      bounced: emails.filter((e) => e.status === EmailStatus.BOUNCED).length,
      openRate: 0,
      clickRate: 0,
      deliveryRate: 0,
    };

    if (stats.delivered > 0) {
      stats.openRate = (stats.opened / stats.delivered) * 100;
      stats.clickRate = (stats.clicked / stats.delivered) * 100;
    }

    if (stats.total > 0) {
      stats.deliveryRate = (stats.delivered / stats.total) * 100;
    }

    return stats;
  }

  // Legacy method for backward compatibility
  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const baseUrl = this.configService.get<string>('FRONTEND_URL');
    const verificationLink = `${baseUrl}/verify-email?token=${token}`;

    await this.queueEmail({
      to,
      subject: 'Verify your email address',
      templateName: 'verify-email',
      templateData: {
        username: to.split('@')[0],
        verificationLink,
        expiryHours: 24,
      },
      emailType: EmailType.EMAIL_VERIFICATION,
    });
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const baseUrl = this.configService.get<string>('FRONTEND_URL');
    const resetLink = `${baseUrl}/reset-password?token=${token}`;
    const companyName =
      this.configService.get<string>('COMPANY_NAME') || 'Our Company';

    const html = await this.renderTemplate('reset-password', {
      username: to.split('@')[0],
      resetLink,
      companyName,
      expiryHours: 24,
    });

    try {
      await this.transporter.sendMail({
        from: `"${companyName}" <${this.configService.get('SMTP_FROM_EMAIL')}>`,
        to,
        subject: 'Reset Your Password',
        html,
      });
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new InternalServerErrorException(
        'Failed to send password reset email',
      );
    }
  }

  async sendPasswordChangedEmail(to: string): Promise<void> {
    const companyName =
      this.configService.get<string>('COMPANY_NAME') || 'Our Company';

    const html = await this.renderTemplate('password-changed', {
      username: to.split('@')[0],
      companyName,
      timestamp: new Date().toLocaleString(),
    });

    try {
      await this.transporter.sendMail({
        from: `"${companyName} Security Team" <${this.configService.get('SMTP_FROM_EMAIL')}>`,
        to,
        subject: 'Your Password Has Been Changed',
        html,
      });
    } catch (error) {
      console.error('Error sending password changed email:', error);
      throw new InternalServerErrorException(
        'Failed to send password changed email',
      );
    }
  }
}
