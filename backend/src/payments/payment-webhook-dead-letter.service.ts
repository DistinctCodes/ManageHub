import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentWebhookDeadLetter } from './entities/payment-webhook-dead-letter.entity';
import { withRequestId } from '../common/request-context';

export type WebhookDeadLetterReason =
  | 'invalid_signature'
  | 'malformed_payload'
  | 'process_error';

/**
 * Persists webhook deliveries that failed processing so they are never
 * silently dropped (issue #1811). Each entry keeps the raw payload for
 * manual inspection plus a `reviewed` flag for operator triage. See the
 * payments README for the reasons table.
 */
@Injectable()
export class PaymentWebhookDeadLetterService {
  private readonly logger = new Logger(PaymentWebhookDeadLetterService.name);

  constructor(
    @InjectRepository(PaymentWebhookDeadLetter)
    private readonly repository: Repository<PaymentWebhookDeadLetter>,
  ) {}

  async enqueue(input: {
    rawPayloadHash: string;
    rawPayload: string;
    reason: WebhookDeadLetterReason;
    providerReference?: string | null;
    errorMessage?: string | null;
  }): Promise<PaymentWebhookDeadLetter> {
    const entry = await this.repository.save(
      this.repository.create({
        rawPayloadHash: input.rawPayloadHash,
        rawPayload: input.rawPayload,
        reason: input.reason,
        providerReference: input.providerReference ?? null,
        errorMessage: input.errorMessage ?? null,
      }),
    );
    this.logger.warn(
      withRequestId(
        `Webhook dead-lettered (reason=${input.reason}, hash=${input.rawPayloadHash})`,
      ),
    );
    return entry;
  }
}
