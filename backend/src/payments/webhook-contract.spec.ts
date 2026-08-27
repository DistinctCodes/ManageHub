import {
  PAYMENT_WEBHOOK_CONTRACT_VERSION,
  validateWebhookPayload,
} from './webhook-contract';

describe('webhook-contract', () => {
  it('exposes a versioned contract', () => {
    expect(PAYMENT_WEBHOOK_CONTRACT_VERSION).toBe('1.0');
  });

  it('accepts a well-formed normalized payload', () => {
    expect(
      validateWebhookPayload({ providerReference: 'p1', outcome: 'confirmed' }),
    ).toEqual({
      providerReference: 'p1',
      outcome: 'confirmed',
    });
  });

  it('accepts every legal outcome', () => {
    for (const outcome of ['confirmed', 'failed', 'pending']) {
      expect(
        validateWebhookPayload({ providerReference: 'p1', outcome }),
      ).toEqual({ providerReference: 'p1', outcome });
    }
  });

  it('rejects a non-object payload', () => {
    for (const bad of [null, 'string', 42, [], undefined]) {
      expect(() => validateWebhookPayload(bad)).toThrow(/JSON object/);
    }
  });

  it('rejects a missing or blank providerReference with a clear error', () => {
    expect(() => validateWebhookPayload({ outcome: 'confirmed' })).toThrow(
      /providerReference/,
    );
    expect(() =>
      validateWebhookPayload({
        providerReference: '   ',
        outcome: 'confirmed',
      }),
    ).toThrow(/providerReference/);
  });

  it('rejects an unknown or missing outcome with a clear error', () => {
    expect(() => validateWebhookPayload({ providerReference: 'p1' })).toThrow(
      /outcome/,
    );
    expect(() =>
      validateWebhookPayload({ providerReference: 'p1', outcome: 'bogus' }),
    ).toThrow(/outcome/);
  });
});
