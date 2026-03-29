import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
  // Assume you already have a mailerService injected

  private formatAmount(amountInKobo: number): string {
    return (amountInKobo / 100).toLocaleString('en-NG');
  }

  async sendPaymentFailedEmail(
    to: string,
    fullName: string,
    data: {
      amount: number;
      reference: string;
    },
  ): Promise<void> {
    await this.mailerService.sendMail({
      to,
      subject: 'Payment Failed',
      template: 'payment-failed',
      context: {
        fullName,
        amount: this.formatAmount(data.amount),
        reference: data.reference,
      },
    });
  }

  async sendPaymentSuccessEmail(
    to: string,
    fullName: string,
    data: {
      bookingId: string;
      workspaceName: string;
      amount: number;
      reference: string;
      paidAt: Date;
    },
  ): Promise<void> {
    await this.mailerService.sendMail({
      to,
      subject: 'Payment Receipt',
      template: 'payment-success',
      context: {
        fullName,
        bookingId: data.bookingId,
        workspaceName: data.workspaceName,
        amount: this.formatAmount(data.amount),
        reference: data.reference,
        paidAt: data.paidAt.toLocaleString(),
      },
    });
  }
}