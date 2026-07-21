import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { HandleWebhookProvider } from './providers/handle-webhook.provider';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly paystackSecretKey: string;
  private readonly paystackBaseUrl = 'https://api.paystack.co';

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly httpService: HttpService,
    private readonly webhookHandler: HandleWebhookProvider,
  ) {
    this.paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';
  }

  async verifyByReference(reference: string): Promise<Payment | null> {
    const payment = await this.paymentRepository.findOne({
      where: { reference },
    });

    if (!payment) {
      return null;
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      return payment;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.paystackBaseUrl}/transaction/verify/${reference}`,
          {
            headers: {
              Authorization: `Bearer ${this.paystackSecretKey}`,
            },
          },
        ),
      );

      const { data } = response.data;

      if (data.status === 'success') {
        payment.status = PaymentStatus.SUCCESS;
        payment.paystackReference = data.reference;
        payment.gatewayResponse = data.gateway_response;
        payment.paidAt = new Date(data.paid_at);
        payment.amount = data.amount / 100;
        payment.currency = data.currency;

        await this.paymentRepository.save(payment);

        await this.webhookHandler.handlePaymentSuccess(payment);
      } else if (data.status === 'abandoned') {
        payment.status = PaymentStatus.ABANDONED;
        payment.gatewayResponse = data.gateway_response;
        await this.paymentRepository.save(payment);
      } else {
        payment.status = PaymentStatus.FAILED;
        payment.gatewayResponse = data.gateway_response;
        await this.paymentRepository.save(payment);
      }
    } catch (error) {
      this.logger.error(
        `Failed to verify payment ${reference}: ${error.message}`,
      );
    }

    return payment;
  }

  async create(data: {
    reference: string;
    amount: number;
    currency?: string;
    email?: string;
    userId?: string;
    description?: string;
    metadata?: Record<string, unknown>;
    bookingId?: string;
  }): Promise<Payment> {
    const payment = this.paymentRepository.create({
      reference: data.reference,
      amount: data.amount,
      currency: data.currency || 'NGN',
      email: data.email,
      userId: data.userId,
      description: data.description,
      metadata: data.metadata,
      bookingId: data.bookingId,
      status: PaymentStatus.PENDING,
    });

    return this.paymentRepository.save(payment);
  }

  async releaseByBookingId(bookingId: string): Promise<void> {
    await this.webhookHandler.handleBookingCompleted(bookingId);
  }

  async refundByBookingId(bookingId: string): Promise<void> {
    await this.webhookHandler.handleBookingCancelled(bookingId);
  }
}
