import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual, randomUUID } from 'crypto';
import { Payment } from '../entities/payment.entity';
import {
  PaymentInitiationResult,
  PaymentRailAdapter,
  PaymentVerificationOutcome,
  PaymentVerificationResult,
  WebhookPayload,
  WebhookSignatureInput,
} from '../interfaces/payment-rail-adapter.interface';

/**
 * Placeholder adapter used until the real Paystack / Stellar adapters land
 * (issues 3-7 of the payment track). Never wired to a live provider.
 *
 * verifyByReference is deterministic on the providerReference so tests (and
 * manual sandbox testing) can exercise every outcome without needing a real
 * provider: a reference containing "fail"/"pending" produces that outcome,
 * anything else is treated as confirmed.
 */
@Injectable()
export class SandboxRailAdapter implements PaymentRailAdapter {
  constructor(private readonly config: ConfigService) {}

  async initiate(payment: Payment): Promise<PaymentInitiationResult> {
    return {
      providerReference: `sandbox_${randomUUID()}`,
      metadata: { sandbox: true, bookingId: payment.bookingId },
    };
  }

  verifyWebhookSignature({
    rawBody,
    signatureHeader,
  }: WebhookSignatureInput): boolean {
    if (!signatureHeader) {
      return false;
    }
    const secret = this.config.get<string>('PAYMENT_WEBHOOK_SECRET');
    if (!secret) {
      return false;
    }

    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const expectedBuf = Buffer.from(expected, 'utf8');
    const providedBuf = Buffer.from(signatureHeader, 'utf8');

    if (expectedBuf.length !== providedBuf.length) {
      return false;
    }
    return timingSafeEqual(expectedBuf, providedBuf);
  }

  parseWebhookPayload(rawBody: Buffer): WebhookPayload {
    const parsed: unknown = JSON.parse(rawBody.toString('utf8'));
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as { providerReference?: unknown }).providerReference !==
        'string' ||
      !SandboxRailAdapter.isOutcome((parsed as { outcome?: unknown }).outcome)
    ) {
      throw new Error('Malformed sandbox webhook payload');
    }
    const body = parsed as {
      providerReference: string;
      outcome: PaymentVerificationOutcome;
    };
    return { providerReference: body.providerReference, outcome: body.outcome };
  }

  async verifyByReference(
    providerReference: string,
  ): Promise<PaymentVerificationResult> {
    if (providerReference.includes('fail')) {
      return { outcome: 'failed' };
    }
    if (providerReference.includes('pending')) {
      return { outcome: 'pending' };
    }
    return { outcome: 'confirmed' };
  }

  private static isOutcome(
    value: unknown,
  ): value is PaymentVerificationOutcome {
    return value === 'confirmed' || value === 'failed' || value === 'pending';
  }
}
