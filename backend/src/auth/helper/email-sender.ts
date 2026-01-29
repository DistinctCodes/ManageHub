import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  sendgridClient,
  sendgridSender,
} from '../../config/email/sendgrid-config';
import {
  loadHtmlTemplate,
  replacePlaceholders,
} from '../../config/email/email.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendEmail(to: string, subject: string, htmlBody: string) {
    const msg = {
      to,
      from: sendgridSender,
      subject,
      html: htmlBody,
    };

    try {
      await sendgridClient.send(msg);
      this.logger.log(`Email sent successfully to ${to}`);
      return { success: true };
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const errObj = error as { response?: { body?: any }; message?: string };
        this.logger.error(
          `SendGrid send failed for ${to}: ${JSON.stringify(errObj.response?.body) || errObj.message}`,
        );
      } else {
        this.logger.error(`SendGrid send failed for ${to}: ${String(error)}`);
      }

      throw new InternalServerErrorException('Failed to send email');
    }
  }

  async sendVerificationEmail(to: string, otp: string, fullName: string) {
    try {
      let htmlContent = await loadHtmlTemplate('verification-email');

      const placeholders: Record<string, string> = { fullName };
      otp.split('').forEach((digit, index) => {
        placeholders[`otp${index + 1}`] = digit;
      });

      htmlContent = replacePlaceholders(htmlContent, placeholders);

      await this.sendEmail(to, 'OTP Verification Code', htmlContent);
      this.logger.log(`OTP email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(`Error sending OTP email to ${to}: ${error}`);
      throw new InternalServerErrorException('Error in sending OTP email');
    }
  }

  async sendPasswordResetEmail(to: string, otp: string, fullName: string) {
    try {
      let htmlContent = await loadHtmlTemplate('reset-password-email');

      const placeholders: Record<string, string> = { fullName: fullName };
      otp.split('').forEach((digit, index) => {
        placeholders[`otp${index + 1}`] = digit;
      });

      htmlContent = replacePlaceholders(htmlContent, placeholders);

      await this.sendEmail(to, 'Password Reset Code', htmlContent);
      this.logger.log(`Password reset email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(
        `Error sending password reset email to ${to}: ${error}`,
      );
      throw new InternalServerErrorException(
        'Error in sending password reset email',
      );
    }
  }
}
