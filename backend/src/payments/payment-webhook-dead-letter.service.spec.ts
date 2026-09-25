import { PaymentWebhookDeadLetterService } from './payment-webhook-dead-letter.service';
import { PaymentWebhookDeadLetter } from './entities/payment-webhook-dead-letter.entity';

function makeDeadLetterRepository() {
  return {
    create: jest.fn((data) => ({ ...data })),
    save: jest.fn(async (entity) => entity),
  };
}

describe('PaymentWebhookDeadLetterService', () => {
  it('persists a dead-letter entry with the raw payload and reason', async () => {
    const repository = makeDeadLetterRepository();
    const service = new PaymentWebhookDeadLetterService(repository as any);

    const entry = await service.enqueue({
      rawPayloadHash: 'abc123',
      rawPayload: '{"providerReference":"ref-1","outcome":"confirmed"}',
      reason: 'process_error',
      providerReference: 'ref-1',
      errorMessage: 'database unavailable',
    });

    expect(repository.create).toHaveBeenCalledWith({
      rawPayloadHash: 'abc123',
      rawPayload: '{"providerReference":"ref-1","outcome":"confirmed"}',
      reason: 'process_error',
      providerReference: 'ref-1',
      errorMessage: 'database unavailable',
    });
    expect(repository.save).toHaveBeenCalled();
    expect(entry).toEqual(
      expect.objectContaining({
        rawPayloadHash: 'abc123',
        reason: 'process_error',
      }),
    );
  });

  it('defaults providerReference and errorMessage to null when omitted', async () => {
    const repository = makeDeadLetterRepository();
    const service = new PaymentWebhookDeadLetterService(repository as any);

    await service.enqueue({
      rawPayloadHash: 'hash-1',
      rawPayload: '{}',
      reason: 'invalid_signature',
    });

    expect(repository.create).toHaveBeenCalledWith({
      rawPayloadHash: 'hash-1',
      rawPayload: '{}',
      reason: 'invalid_signature',
      providerReference: null,
      errorMessage: null,
    });
  });
});
