import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Payment } from '../entities/payment.entity';
import {
  PaymentInitiationResult,
  PaymentRailAdapter,
} from '../interfaces/payment-rail-adapter.interface';

/**
 * Placeholder adapter used until the real Paystack / Stellar adapters land
 * (issues 2-7 of the payment track). Never wired to a live provider.
 */
@Injectable()
export class SandboxRailAdapter implements PaymentRailAdapter {
  async initiate(payment: Payment): Promise<PaymentInitiationResult> {
    return {
      providerReference: `sandbox_${randomUUID()}`,
      metadata: { sandbox: true, bookingId: payment.bookingId },
    };
  }
}
