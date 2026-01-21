import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { getVerifyEmailTemplate } from './templates/verify-email-template';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<boolean>('SMTP_SECURE'), // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const baseUrl = this.configService.get<string>('FRONTEND_URL');
    // Assuming the frontend route is /verify-email?token=...
    const verificationLink = `${baseUrl}/verify-email?token=${token}`;
    const companyName =
      this.configService.get<string>('COMPANY_NAME') || 'Our Company';

    const html = getVerifyEmailTemplate(verificationLink, companyName);

    try {
      await this.transporter.sendMail({
        from: `"${companyName}" <${this.configService.get('SMTP_FROM_EMAIL')}>`,
        to,
        subject: 'Verify your email address',
        html,
      });
    } catch (error) {
      console.error('Error sending email:', error);
      throw new InternalServerErrorException(
        'Failed to send verification email',
      );
    }
  }
}
