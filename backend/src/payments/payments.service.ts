import { Injectable, NotFoundException } from '@nestjs/common';
import { InitializePaymentProvider } from './providers/initialize-payment.provider';
import { HandleWebhookProvider } from './providers/handle-webhook.provider';
import { RefundPaymentProvider } from './providers/refund-payment.provider';
import {
  FindPaymentsProvider,
  PaymentQuery,
} from './providers/find-payments.provider';
import { UserRole } from '../users/enums/userRoles.enum';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly initializePaymentProvider: InitializePaymentProvider,
    private readonly handleWebhookProvider: HandleWebhookProvider,
    private readonly refundPaymentProvider: RefundPaymentProvider,
    private readonly findPaymentsProvider: FindPaymentsProvider,
  ) {}

  initialize(bookingId: string, userId: string) {
    return this.initializePaymentProvider.initialize(bookingId, userId);
  }

  handleWebhook(rawBody: Buffer, signature: string) {
    return this.handleWebhookProvider.handle(rawBody, signature);
  }

  refund(paymentId: string, userId: string, userRole: UserRole) {
    return this.refundPaymentProvider.refund(paymentId, userId, userRole);
  }

  findAll(query: PaymentQuery, userId: string, userRole: UserRole) {
    return this.findPaymentsProvider.findAll(query, userId, userRole);
  }

  async findById(paymentId: string, userId: string, userRole: UserRole) {
    const payment = await this.findPaymentsProvider.findById(
      paymentId,
      userId,
      userRole,
    );
    if (!payment) {
      throw new NotFoundException(`Payment "${paymentId}" not found`);
    }
    return payment;
  }
}
