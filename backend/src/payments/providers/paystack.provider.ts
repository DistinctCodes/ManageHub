import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

const PAYSTACK_BASE = 'https://api.paystack.co';

@Injectable()
export class PaystackProvider {
  private readonly logger = new Logger(PaystackProvider.name);
  private readonly secretKey: string;

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  async initializeTransaction(
    email: string,
    amountKobo: number,
    reference: string,
    callbackUrl: string,
    metadata?: Record<string, unknown>,
  ): Promise<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }> {
    const { data } = await axios.post(
      `${PAYSTACK_BASE}/transaction/initialize`,
      {
        email,
        amount: amountKobo,
        reference,
        callback_url: callbackUrl,
        metadata,
      },
      { headers: this.headers },
    );
    return data.data;
  }

  async verifyTransaction(reference: string): Promise<Record<string, unknown>> {
    const { data } = await axios.get(
      `${PAYSTACK_BASE}/transaction/verify/${reference}`,
      { headers: this.headers },
    );
    return data.data as Record<string, unknown>;
  }

  async initiateRefund(
    transactionReference: string,
    amountKobo?: number,
  ): Promise<Record<string, unknown>> {
    const payload: Record<string, unknown> = {
      transaction: transactionReference,
    };
    if (amountKobo) payload.amount = amountKobo;

    const { data } = await axios.post(`${PAYSTACK_BASE}/refund`, payload, {
      headers: this.headers,
    });
    return data.data as Record<string, unknown>;
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(rawBody)
      .digest('hex');
    return hash === signature;
  }
}
