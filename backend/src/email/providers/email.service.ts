import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  EmailOptions,
  EmailTemplate,
} from '../interfaces/email-options.interface';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    try {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('EMAIL_HOST'),
        port: this.configService.get<number>('EMAIL_PORT'),
        secure: false, // true for 465, false for other ports
        auth: {
          user: this.configService.get<string>('EMAIL_USER'),
          pass: this.configService.get<string>('EMAIL_PASS'),
        },
      });

      this.logger.log('Email transporter initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize email transporter', error);
      throw error;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: options.from || this.configService.get<string>('EMAIL_FROM'),
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(
        `Email sent successfully to ${options.to}. MessageId: ${result.messageId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error);
      return false;
    }
  }

  async sendRegistrationConfirmation(
    userEmail: string,
    userName: string,
  ): Promise<boolean> {
    const template = this.getRegistrationConfirmationTemplate(userName);

    return await this.sendEmail({
      to: userEmail,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  async sendPasswordResetEmail(
    userEmail: string,
    userName: string,
    resetLink: string,
    token: string,
  ): Promise<boolean> {
    const template = this.getPasswordResetTemplate(userName, resetLink, token);
    return await this.sendEmail({
      to: userEmail,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  async sendPasswordResetSuccessEmail(
    userEmail: string,
    userName: string,
  ): Promise<boolean> {
    const template = this.getPasswordResetSuccessTemplate(userName);

    return await this.sendEmail({
      to: userEmail,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  private getRegistrationConfirmationTemplate(userName: string): EmailTemplate {
    const platformName = 'ManageHub';

    return {
      subject: `Welcome to ${platformName} - Registration Successful!`,
      text: `Dear ${userName},\n\nYour registration on ${platformName} was successful!\n\nWelcome to our platform. You can now access all the features and services we offer.\n\nIf you have any questions or need assistance, please don't hesitate to contact our support team.\n\nBest regards,\nThe ${platformName} Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="color: #333; margin-bottom: 20px;">Welcome to ${platformName}!</h1>
            <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #28a745; margin-bottom: 20px;">✅ Registration Successful!</h2>
              <p style="font-size: 16px; line-height: 1.6; color: #555; margin-bottom: 20px;">
                Dear <strong>${userName}</strong>,
              </p>
              <p style="font-size: 16px; line-height: 1.6; color: #555; margin-bottom: 20px;">
                Your registration on <strong>${platformName}</strong> was successful! We're excited to have you on board.
              </p>
              <p style="font-size: 16px; line-height: 1.6; color: #555; margin-bottom: 30px;">
                You can now access all the features and services we offer. If you have any questions or need assistance, please don't hesitate to contact our support team.
              </p>
              <div style="background-color: #e9ecef; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #6c757d;">
                  <strong>Need help?</strong> Contact our support team anytime.
                </p>
              </div>
              <p style="font-size: 14px; color: #6c757d; margin-top: 30px;">
                Best regards,<br>
                The ${platformName} Team
              </p>
            </div>
          </div>
        </div>
      `,
    };
  }

  private getPasswordResetTemplate(
    userName: string,
    resetLink: string,
    token: string,
  ): EmailTemplate {
    const platformName = 'ManageHub';
    return {
      subject: `Reset your ${platformName} password`,
      text: `Hello ${userName},\n\nWe received a request to reset your password for your ${platformName} account.\n\nUse the link below to set a new password:\n${resetLink}\n\nIf the link doesn't work, you can also use this token directly: ${token}\n\nIf you didn't request a password reset, you can ignore this email.\n\nThanks,\nThe ${platformName} Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
            <h2 style="color: #333;">Reset your password</h2>
            <p style="font-size: 16px; color: #555;">Hello <strong>${userName}</strong>,</p>
            <p style="font-size: 16px; color: #555;">We received a request to reset your password for your ${platformName} account.</p>
            <p style="font-size: 16px; color: #555;">Click the button below to set a new password:</p>
            <p style="text-align:center; margin: 24px 0;">
              <a href="${resetLink}" style="display:inline-block; padding: 12px 24px; background-color: #0d6efd; color: white; text-decoration: none; border-radius: 6px;">Reset Password</a>
            </p>
            <p style="font-size: 14px; color: #6c757d;">If the button doesn't work, copy and paste this URL into your browser:</p>
            <p style="font-size: 14px; word-break: break-all;"><a href="${resetLink}">${resetLink}</a></p>
            <p style="font-size: 14px; color: #6c757d;">You can also use this token directly: <code>${token}</code></p>
            <p style="font-size: 14px; color: #6c757d;">If you didn't request a password reset, you can safely ignore this email.</p>
            <p style="font-size: 14px; color: #6c757d;">Thanks,<br/>The ${platformName} Team</p>
          </div>
        </div>
      `,
    };
  }

  private getPasswordResetSuccessTemplate(userName: string): EmailTemplate {
    const platformName = 'ManageHub';

    return {
      subject: `Your ${platformName} password has been reset successfully`,
      text: `Hello ${userName},\n\nThis is a confirmation that your password for your ${platformName} account has been successfully reset.\n\nIf you did not perform this action, please contact our support team immediately.\n\nThank you,\nThe ${platformName} Team`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
          <h2 style="color: #28a745; text-align: center;">✅ Password Reset Successful</h2>
          <p style="font-size: 16px; color: #555;">Hello <strong>${userName}</strong>,</p>
          <p style="font-size: 16px; color: #555;">This is a confirmation that your password for your <strong>${platformName}</strong> account has been successfully reset.</p>
          <div style="background-color: #e9ecef; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #6c757d;">
              If you did not perform this action, please <strong>contact our support team immediately</strong> to secure your account.
            </p>
          </div>
          <p style="font-size: 14px; color: #6c757d; margin-top: 30px;">
            Thank you,<br>
            The ${platformName} Team
          </p>
        </div>
      </div>
    `,
    };
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('Email service connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error('Email service connection verification failed', error);
      return false;
    }
  }
}
