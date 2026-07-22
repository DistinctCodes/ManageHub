import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PaystackProvider } from './paystack.provider';
import { PaymentOutcomeProvider } from './payment-outcome.provider';

@Injectable()
export class HandleWebhookProvider {
  private readonly logger = new Logger(HandleWebhookProvider.name);

  constructor(
    private readonly paystackProvider: PaystackProvider,
    private readonly paymentOutcomeProvider: PaymentOutcomeProvider,
  ) {}

  async handle(rawBody: Buffer, signature: string): Promise<void> {
    const valid = this.paystackProvider.verifyWebhookSignature(
      rawBody,
      signature,
    );
    if (!valid) {
      throw new UnauthorizedException('Invalid Paystack webhook signature');
    }

    let event: Record<string, unknown>;
    try {
      event = JSON.parse(rawBody.toString()) as Record<string, unknown>;
    } catch {
      throw new BadRequestException('Malformed webhook payload');
    }

    const eventType = event.event as string;
    const data = event.data as Record<string, unknown>;
    const reference = data?.reference as string;

    if (!reference) {
      this.logger.warn(`Webhook event "${eventType}" has no reference - skipped`);
      return;
    }

    if (eventType === 'charge.success') {
      await this.paymentOutcomeProvider.handleChargeSuccess(reference, data);
    } else if (eventType === 'charge.failed') {
      await this.paymentOutcomeProvider.handleChargeFailed(reference);
    } else {
      this.logger.log(`Unhandled Paystack event: ${eventType}`);
    }
  }
}
