import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PaymentWebhookController } from './payment-webhook.controller';
import { ConfirmationSource } from './enums/confirmation-source.enum';
import { PAYMENT_WEBHOOK_CONTRACT_VERSION } from './webhook-contract';

function makeRequest(bodyObject: unknown) {
  const rawBody = Buffer.from(JSON.stringify(bodyObject));
  return { rawBody, body: bodyObject } as any;
}

const FRESH_TIMESTAMP = String(Date.now());

describe('PaymentWebhookController', () => {
  let railAdapter: {
    verifyWebhookSignature: jest.Mock;
    parseWebhookPayload: jest.Mock;
  };
  let confirmationService: {
    apply: jest.Mock;
    logRejectedWebhook: jest.Mock;
  };
  let deadLetterService: {
    enqueue: jest.Mock;
  };
  let replay: {
    isWithinTolerance: jest.Mock;
    claimEvent: jest.Mock;
  };
  let controller: PaymentWebhookController;

  beforeEach(() => {
    railAdapter = {
      verifyWebhookSignature: jest.fn(),
      parseWebhookPayload: jest.fn(),
    };
    confirmationService = {
      apply: jest.fn(),
      logRejectedWebhook: jest.fn(),
    };
    deadLetterService = {
      enqueue: jest.fn(),
    };
    replay = {
      isWithinTolerance: jest.fn().mockReturnValue(true),
      claimEvent: jest.fn().mockResolvedValue(true),
    };
    controller = new PaymentWebhookController(
      railAdapter as any,
      confirmationService as any,
      deadLetterService as any,
      replay as any,
    );
  });

  it('rejects and logs a webhook with an invalid signature, never reaching apply', async () => {
    railAdapter.verifyWebhookSignature.mockReturnValueOnce(false);
    const req = makeRequest({
      providerReference: 'ref-1',
      outcome: 'confirmed',
    });

    await expect(
      controller.sandbox(req, 'bad-sig', FRESH_TIMESTAMP),
    ).rejects.toThrow(UnauthorizedException);

    expect(confirmationService.logRejectedWebhook).toHaveBeenCalledWith(
      expect.any(String),
      'invalid_signature',
    );
    expect(deadLetterService.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'invalid_signature',
        rawPayload: JSON.stringify({
          providerReference: 'ref-1',
          outcome: 'confirmed',
        }),
      }),
    );
    expect(confirmationService.apply).not.toHaveBeenCalled();
  });

  it('rejects and logs a stale timestamp as replay, never reaching apply', async () => {
    railAdapter.verifyWebhookSignature.mockReturnValueOnce(true);
    replay.isWithinTolerance.mockReturnValueOnce(false);
    const req = makeRequest({
      providerReference: 'ref-1',
      outcome: 'confirmed',
    });

    await expect(controller.sandbox(req, 'good-sig', '1000')).rejects.toThrow(
      UnauthorizedException,
    );

    expect(replay.isWithinTolerance).toHaveBeenCalledWith(1000);
    expect(confirmationService.logRejectedWebhook).toHaveBeenCalledWith(
      expect.any(String),
      'replay',
    );
    expect(deadLetterService.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'replay' }),
    );
    expect(confirmationService.apply).not.toHaveBeenCalled();
  });

  it('acknowledges a duplicate event id without applying it twice', async () => {
    railAdapter.verifyWebhookSignature.mockReturnValueOnce(true);
    railAdapter.parseWebhookPayload.mockReturnValueOnce({
      providerReference: 'ref-1',
      outcome: 'confirmed',
    });
    replay.claimEvent.mockResolvedValueOnce(false);
    const req = makeRequest({
      providerReference: 'ref-1',
      outcome: 'confirmed',
    });

    const result = await controller.sandbox(
      req,
      'good-sig',
      FRESH_TIMESTAMP,
      'event-123',
    );

    expect(result).toEqual({
      received: true,
      contractVersion: PAYMENT_WEBHOOK_CONTRACT_VERSION,
    });
    expect(replay.claimEvent).toHaveBeenCalledWith('event-123');
    expect(confirmationService.apply).not.toHaveBeenCalled();
  });

  it('rejects and logs a malformed (but authentically signed) payload', async () => {
    railAdapter.verifyWebhookSignature.mockReturnValueOnce(true);
    railAdapter.parseWebhookPayload.mockImplementationOnce(() => {
      throw new Error('bad shape');
    });
    const req = makeRequest({ nonsense: true });

    await expect(
      controller.sandbox(req, 'good-sig', FRESH_TIMESTAMP),
    ).rejects.toThrow(BadRequestException);

    expect(confirmationService.logRejectedWebhook).toHaveBeenCalledWith(
      expect.any(String),
      'malformed_payload',
    );
    expect(deadLetterService.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'malformed_payload',
        errorMessage: 'bad shape',
      }),
    );
    expect(confirmationService.apply).not.toHaveBeenCalled();
  });

  it('dead-letters a well-formed webhook whose apply step throws', async () => {
    railAdapter.verifyWebhookSignature.mockReturnValueOnce(true);
    railAdapter.parseWebhookPayload.mockReturnValueOnce({
      providerReference: 'ref-1',
      outcome: 'confirmed',
    });
    confirmationService.apply.mockRejectedValueOnce(
      new Error('database unavailable'),
    );
    const req = makeRequest({
      providerReference: 'ref-1',
      outcome: 'confirmed',
    });

    await expect(
      controller.sandbox(req, 'good-sig', FRESH_TIMESTAMP),
    ).rejects.toThrow();

    expect(deadLetterService.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'process_error',
        providerReference: 'ref-1',
        errorMessage: 'database unavailable',
      }),
    );
  });

  it('applies a validly signed, well-formed webhook', async () => {
    railAdapter.verifyWebhookSignature.mockReturnValueOnce(true);
    railAdapter.parseWebhookPayload.mockReturnValueOnce({
      providerReference: 'ref-1',
      outcome: 'confirmed',
    });
    const req = makeRequest({
      providerReference: 'ref-1',
      outcome: 'confirmed',
    });

    const result = await controller.sandbox(req, 'good-sig', FRESH_TIMESTAMP);

    expect(result).toEqual({
      received: true,
      contractVersion: PAYMENT_WEBHOOK_CONTRACT_VERSION,
    });
    expect(confirmationService.apply).toHaveBeenCalledWith(
      'ref-1',
      'confirmed',
      ConfirmationSource.WEBHOOK,
      expect.any(String),
    );
    expect(deadLetterService.enqueue).not.toHaveBeenCalled();
  });
});
