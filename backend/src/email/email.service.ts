import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
    });
  }

  private compileTemplate(
    templateName: string,
    context: Record<string, any>,
  ): string {
    const templatePath = path.join(
      __dirname,
      'templates',
      `${templateName}.hbs`,
    );
    const source = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(source);
    return template(context);
  }

  private async send(
    to: string,
    subject: string,
    html: string,
  ): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('EMAIL_FROM'),
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}: ${subject}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      return false;
    }
  }

  async sendVerificationEmail(
    email: string,
    otp: string,
    fullName: string,
  ): Promise<boolean> {
    const html = this.compileTemplate('verification-otp', { otp, fullName });
    return this.send(email, 'Verify Your Email', html);
  }

  async sendPasswordResetEmail(
    email: string,
    otp: string,
    fullName: string,
  ): Promise<boolean> {
    const html = this.compileTemplate('password-reset-otp', { otp, fullName });
    return this.send(email, 'Password Reset Code', html);
  }

  async sendVerificationLinkEmail(
    email: string,
    token: string,
    fullName: string,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || '';
    const verifyUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
    const html = this.compileTemplate('verification-link', {
      fullName,
      verifyUrl,
    });
    return this.send(email, 'Verify Your Email', html);
  }

  async sendPasswordResetLinkEmail(
    email: string,
    fullName: string,
    resetLink: string,
  ): Promise<boolean> {
    const html = this.compileTemplate('password-reset-link', {
      fullName,
      resetLink,
    });
    return this.send(email, 'Reset Your Password', html);
  }

  async sendPasswordResetSuccessEmail(
    email: string,
    fullName: string,
  ): Promise<boolean> {
    const html = this.compileTemplate('password-reset-success', { fullName });
    return this.send(email, 'Password Reset Successful', html);
  }

  async sendTemplateEmail(
    email: string,
    subject: string,
    templateName: string,
    placeholders: Record<string, any>,
  ): Promise<boolean> {
    const html = this.compileTemplate(templateName, placeholders);
    return this.send(email, subject, html);
  }

  async sendContactConfirmation(
    email: string,
    fullName: string,
    subject: string,
  ): Promise<boolean> {
    const html = this.compileTemplate('contact-confirmation', {
      fullName,
      subject,
    });
    return this.send(email, 'We received your message', html);
  }

  async sendContactNotification(
    fullName: string,
    email: string,
    subject: string,
    message: string,
  ): Promise<boolean> {
    const adminEmail =
      this.configService.get<string>('ADMIN_EMAIL') ||
      this.configService.get<string>('EMAIL_FROM');
    const html = this.compileTemplate('contact-notification', {
      fullName,
      email,
      subject,
      message,
    });
    return this.send(adminEmail, `New Contact: ${subject}`, html);
  }
}
