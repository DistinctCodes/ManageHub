import { createWebhookEventLog } from './webhook-event-logger';

describe('createWebhookEventLog', () => {
  it('generates a UUID id', () => {
    const log = createWebhookEventLog('charge.success', {}, 'RECEIVED');
    expect(log.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('sets receivedAt as an ISO 8601 string', () => {
    const log = createWebhookEventLog('charge.success', {}, 'RECEIVED');
    expect(() => new Date(log.receivedAt)).not.toThrow();
    expect(log.receivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('stores the event and status', () => {
    const log = createWebhookEventLog('transfer.failed', {}, 'FAILED', 'timeout');
    expect(log.event).toBe('transfer.failed');
    expect(log.status).toBe('FAILED');
    expect(log.error).toBe('timeout');
  });

  it('omits the error field when not provided', () => {
    const log = createWebhookEventLog('charge.success', {}, 'PROCESSED');
    expect('error' in log).toBe(false);
  });

  it('removes keys matching /(card|cvv|pan|account_number)/i from payload', () => {
    const payload = {
      card_number: '4111111111111111',
      CardType: 'visa',
      cvv: '123',
      CVV2: '456',
      pan: '411111',
      account_number: '0123456789',
      ACCOUNT_NUMBER: '9876543210',
      reference: 'ref-001',
      amount: 5000,
    };
    const log = createWebhookEventLog('charge.success', payload, 'RECEIVED');

    expect(log.payload).not.toHaveProperty('card_number');
    expect(log.payload).not.toHaveProperty('CardType');
    expect(log.payload).not.toHaveProperty('cvv');
    expect(log.payload).not.toHaveProperty('CVV2');
    expect(log.payload).not.toHaveProperty('pan');
    expect(log.payload).not.toHaveProperty('account_number');
    expect(log.payload).not.toHaveProperty('ACCOUNT_NUMBER');

    expect(log.payload['reference']).toBe('ref-001');
    expect(log.payload['amount']).toBe(5000);
  });

  it('does not mutate the original payload object', () => {
    const payload = { card: '4111', reference: 'ref-002' };
    createWebhookEventLog('charge.success', payload, 'RECEIVED');
    expect(payload).toHaveProperty('card');
  });

  it('handles an empty payload', () => {
    const log = createWebhookEventLog('subscription.create', {}, 'RECEIVED');
    expect(log.payload).toEqual({});
  });
});
