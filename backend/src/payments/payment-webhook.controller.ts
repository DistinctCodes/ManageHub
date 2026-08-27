import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { SandboxRailAdapter } from './adapters/sandbox-rail.adapter';
import { ConfirmationSource } from './enums/confirmation-source.enum';
import {
  PAYMENT_WEBHOOK_CONTRACT_VERSION,
  validateWebhookPayload,
} from './webhook-contract';
import { PaymentConfirmationService } from './payment-confirmation.service';

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

/**
 * One controller per rail (issue #1571) — each verifies transport-level
 * authenticity (HMAC signature here; the on-chain equivalent lands in a
 * later issue) before touching any Payment state, and processes idempotently
 * by construction: PaymentConfirmationService looks up by
 * providerReference and no-ops on an already-terminal Payment.
 *
 * No @UseGuards(JwtAuthGuard) here deliberately — the provider is the
 * caller, not an authenticated user; the HMAC signature IS the auth.
 */
@ApiTags('payments')
@Controller('payments/webhooks')
export class PaymentWebhookController {
  constructor(
    private readonly railAdapter: SandboxRailAdapter,
    private readonly confirmationService: PaymentConfirmationService,
  ) {}

  @Post('sandbox')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Sandbox rail confirmation webhook (HMAC-signed via PAYMENT_WEBHOOK_SECRET)',
    description:
      `Accepts a webhook whose parsed payload conforms to the normalized ` +
      `webhook contract v${PAYMENT_WEBHOOK_CONTRACT_VERSION} documented in the ` +
      `payments README (providerReference + outcome). The transport is ` +
      `authenticated by the HMAC signature; the payload shape is validated ` +
      `against the contract so a wrong-shaped event is rejected, not silently ` +
      `mishandled.`,
  })
  @ApiBody({
    description:
      `Expected parsed shape: { "providerReference": string, ` +
      `"outcome": "confirmed" | "failed" | "pending" }`,
    schema: {
      type: 'object',
      required: ['providerReference', 'outcome'],
      properties: {
        providerReference: { type: 'string' },
        outcome: {
          type: 'string',
          enum: ['confirmed', 'failed', 'pending'],
        },
      },
    },
  })
  async sandbox(
    @Req() req: RawBodyRequest,
    @Headers('x-payment-signature') signature?: string,
  ): Promise<{ received: boolean; contractVersion: string }> {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    const rawPayloadHash = PaymentConfirmationService.hashPayload(rawBody);

    const isValid = this.railAdapter.verifyWebhookSignature({
      rawBody,
      signatureHeader: signature,
    });
    if (!isValid) {
      await this.confirmationService.logRejectedWebhook(
        rawPayloadHash,
        'invalid_signature',
      );
      throw new UnauthorizedException('Invalid webhook signature');
    }

    let payload;
    try {
      payload = this.railAdapter.parseWebhookPayload(rawBody);
      validateWebhookPayload(payload);
    } catch (err) {
      await this.confirmationService.logRejectedWebhook(
        rawPayloadHash,
        'malformed_payload',
      );
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Malformed webhook payload',
      );
    }

    await this.confirmationService.apply(
      payload.providerReference,
      payload.outcome,
      ConfirmationSource.WEBHOOK,
      rawPayloadHash,
    );

    return {
      received: true,
      contractVersion: PAYMENT_WEBHOOK_CONTRACT_VERSION,
    };
  }
}
