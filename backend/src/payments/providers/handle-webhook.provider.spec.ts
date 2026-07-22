import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { HandleWebhookProvider } from './handle-webhook.provider';

describe('HandleWebhookProvider', () => {
  let provider: HandleWebhookProvider;

  const paystackProvider = {
    verifyWebhookSignature: jest.fn().mockReturnValue(true),
  };
  const paymentOutcomeProvider = {
    handleChargeSuccess: jest.fn().mockResolvedValue(undefined),
    handleChargeFailed: jest.fn().mockResolvedValue(undefined),
  };

  const buildEvent = (event: string, reference = 'ref-1') =>
    Buffer.from(JSON.stringify({ event, data: { reference } }));

  beforeEach(() => {
    jest.clearAllMocks();
    paystackProvider.verifyWebhookSignature.mockReturnValue(true);
    provider = new HandleWebhookProvider(
      paystackProvider as any,
      paymentOutcomeProvider as any,
    );
  });

  it('delegates charge.success events to the shared outcome provider', async () => {
    await provider.handle(buildEvent('charge.success'), 'sig');

    expect(paymentOutcomeProvider.handleChargeSuccess).toHaveBeenCalledWith(
      'ref-1',
      { reference: 'ref-1' },
    );
  });

  it('delegates charge.failed events to the shared outcome provider', async () => {
    await provider.handle(buildEvent('charge.failed'), 'sig');

    expect(paymentOutcomeProvider.handleChargeFailed).toHaveBeenCalledWith(
      'ref-1',
    );
  });

  it('does not delegate unhandled Paystack events', async () => {
    await provider.handle(buildEvent('transfer.success'), 'sig');

    expect(paymentOutcomeProvider.handleChargeSuccess).not.toHaveBeenCalled();
    expect(paymentOutcomeProvider.handleChargeFailed).not.toHaveBeenCalled();
  });

  it('rejects invalid webhook signatures', async () => {
    paystackProvider.verifyWebhookSignature.mockReturnValue(false);

    await expect(provider.handle(buildEvent('charge.success'), 'sig')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects malformed JSON payloads', async () => {
    await expect(provider.handle(Buffer.from('{'), 'sig')).rejects.toThrow(
      BadRequestException,
    );
  });
});
