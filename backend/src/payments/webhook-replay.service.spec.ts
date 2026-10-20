import {
  DEFAULT_WEBHOOK_TOLERANCE_SECONDS,
  WebhookReplayService,
} from './webhook-replay.service';

function makeConfig(values: Record<string, unknown> = {}) {
  return {
    get: jest.fn((key: string, fallback?: unknown) =>
      key in values ? values[key] : fallback,
    ),
  };
}

describe('WebhookReplayService', () => {
  describe('tolerance', () => {
    it('defaults to five minutes', () => {
      const service = new WebhookReplayService(makeConfig() as any);
      expect(service.toleranceMs()).toBe(
        DEFAULT_WEBHOOK_TOLERANCE_SECONDS * 1000,
      );
    });

    it('honours a configured tolerance', () => {
      const service = new WebhookReplayService(
        makeConfig({ PAYMENT_WEBHOOK_TOLERANCE_SECONDS: 60 }) as any,
      );
      expect(service.toleranceMs()).toBe(60 * 1000);
    });

    it('falls back to the default for an invalid configured value', () => {
      const service = new WebhookReplayService(
        makeConfig({
          PAYMENT_WEBHOOK_TOLERANCE_SECONDS: 'not-a-number',
        }) as any,
      );
      expect(service.toleranceMs()).toBe(
        DEFAULT_WEBHOOK_TOLERANCE_SECONDS * 1000,
      );
    });
  });

  describe('isWithinTolerance', () => {
    it('accepts a fresh timestamp', () => {
      const service = new WebhookReplayService(makeConfig() as any);
      expect(service.isWithinTolerance(Date.now())).toBe(true);
    });

    it('rejects a stale timestamp', () => {
      const service = new WebhookReplayService(makeConfig() as any);
      expect(service.isWithinTolerance(Date.now() - 10 * 60 * 1000)).toBe(
        false,
      );
    });

    it('rejects a non-numeric timestamp', () => {
      const service = new WebhookReplayService(makeConfig() as any);
      expect(service.isWithinTolerance(Number.NaN)).toBe(false);
    });
  });

  describe('claimEvent', () => {
    it('returns true when Redis records the event id', async () => {
      const service = new WebhookReplayService(makeConfig() as any);
      const set = jest.fn().mockResolvedValue('OK');
      jest.spyOn(service as any, 'getClient').mockReturnValue({ set });

      await expect(service.claimEvent('event-1')).resolves.toBe(true);
      expect(set).toHaveBeenCalledWith(
        'payment-webhook:seen:event-1',
        '1',
        'EX',
        DEFAULT_WEBHOOK_TOLERANCE_SECONDS,
        'NX',
      );
    });

    it('returns false for a duplicate inside the window', async () => {
      const service = new WebhookReplayService(makeConfig() as any);
      const set = jest.fn().mockResolvedValue(null);
      jest.spyOn(service as any, 'getClient').mockReturnValue({ set });

      await expect(service.claimEvent('event-1')).resolves.toBe(false);
    });

    it('fails open when Redis is unreachable', async () => {
      const service = new WebhookReplayService(makeConfig() as any);
      const set = jest.fn().mockRejectedValue(new Error('redis down'));
      jest.spyOn(service as any, 'getClient').mockReturnValue({ set });

      await expect(service.claimEvent('event-1')).resolves.toBe(true);
    });
  });
});
