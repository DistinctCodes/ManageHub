import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PaymentWebhookController } from './payment-webhook.controller';
import { ConfirmationSource } from './enums/confirmation-source.enum';
import { PAYMENT_WEBHOOK_CONTRACT_VERSION } from './webhook-contract';

function makeRequest(bodyObject: unknown) {
  const rawBody = Buffer.from(JSON.stringify(bodyObject));
  return { rawBody, body: bodyObject } as any;
}

describe('PaymentWebhookController', () => {
  let railAdapter: {
    verifyWebhookSignature: jest.Mock;
    parseWebhookPayload: jest.Mock;
  };
  let confirmationService: {
    apply: jest.Mock;
    logRejectedWebhook: jest.Mock;
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
    controller = new PaymentWebhookController(
      railAdapter as any,
      confirmationService as any,
    );
  });

  it('rejects and logs a webhook with an invalid signature, never reaching apply', async () => {
    railAdapter.verifyWebhookSignature.mockReturnValueOnce(false);
    const req = makeRequest({
      providerReference: 'ref-1',
      outcome: 'confirmed',
    });

    await expect(controller.sandbox(req, 'bad-sig')).rejects.toThrow(
      UnauthorizedException,
    );

    expect(confirmationService.logRejectedWebhook).toHaveBeenCalledWith(
      expect.any(String),
      'invalid_signature',
    );
    expect(confirmationService.apply).not.toHaveBeenCalled();
  });

  it('rejects and logs a malformed (but authentically signed) payload', async () => {
    railAdapter.verifyWebhookSignature.mockReturnValueOnce(true);
    railAdapter.parseWebhookPayload.mockImplementationOnce(() => {
      throw new Error('bad shape');
    });
    const req = makeRequest({ nonsense: true });

    await expect(controller.sandbox(req, 'good-sig')).rejects.toThrow(
      BadRequestException,
    );

    expect(confirmationService.logRejectedWebhook).toHaveBeenCalledWith(
      expect.any(String),
      'malformed_payload',
    );
    expect(confirmationService.apply).not.toHaveBeenCalled();
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

    const result = await controller.sandbox(req, 'good-sig');

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
  });
});
