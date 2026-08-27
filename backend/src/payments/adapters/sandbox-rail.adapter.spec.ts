import { createHmac } from 'crypto';
import { SandboxRailAdapter } from './sandbox-rail.adapter';

function makeConfig(secret: string | undefined = 'test-secret') {
  return { get: jest.fn(() => secret) };
}

function sign(secret: string, rawBody: Buffer): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

describe('SandboxRailAdapter', () => {
  describe('initiate', () => {
    it('returns a sandbox provider reference', async () => {
      const adapter = new SandboxRailAdapter(makeConfig() as any);
      const result = await adapter.initiate({ bookingId: 'booking-1' } as any);
      expect(result.providerReference).toMatch(/^sandbox_/);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('accepts a correctly signed payload', () => {
      const adapter = new SandboxRailAdapter(makeConfig('shh') as any);
      const rawBody = Buffer.from(JSON.stringify({ a: 1 }));
      const signature = sign('shh', rawBody);

      expect(
        adapter.verifyWebhookSignature({ rawBody, signatureHeader: signature }),
      ).toBe(true);
    });

    it('rejects a payload with the wrong signature', () => {
      const adapter = new SandboxRailAdapter(makeConfig('shh') as any);
      const rawBody = Buffer.from(JSON.stringify({ a: 1 }));

      expect(
        adapter.verifyWebhookSignature({
          rawBody,
          signatureHeader: 'not-the-right-signature-value',
        }),
      ).toBe(false);
    });

    it('rejects a payload signed with a different secret (tampered or wrong sender)', () => {
      const adapter = new SandboxRailAdapter(makeConfig('shh') as any);
      const rawBody = Buffer.from(JSON.stringify({ a: 1 }));
      const wrongSignature = sign('a-different-secret', rawBody);

      expect(
        adapter.verifyWebhookSignature({
          rawBody,
          signatureHeader: wrongSignature,
        }),
      ).toBe(false);
    });

    it('rejects when the signature header is missing', () => {
      const adapter = new SandboxRailAdapter(makeConfig('shh') as any);
      const rawBody = Buffer.from(JSON.stringify({ a: 1 }));

      expect(
        adapter.verifyWebhookSignature({
          rawBody,
          signatureHeader: undefined,
        }),
      ).toBe(false);
    });

    it('rejects when no secret is configured', () => {
      const adapter = new SandboxRailAdapter(makeConfig(undefined) as any);
      const rawBody = Buffer.from(JSON.stringify({ a: 1 }));

      expect(
        adapter.verifyWebhookSignature({
          rawBody,
          signatureHeader: sign('shh', rawBody),
        }),
      ).toBe(false);
    });
  });

  describe('parseWebhookPayload', () => {
    it('parses a well-formed payload', () => {
      const adapter = new SandboxRailAdapter(makeConfig() as any);
      const rawBody = Buffer.from(
        JSON.stringify({ providerReference: 'ref-1', outcome: 'confirmed' }),
      );

      expect(adapter.parseWebhookPayload(rawBody)).toEqual({
        providerReference: 'ref-1',
        outcome: 'confirmed',
      });
    });

    it('throws on a malformed payload', () => {
      const adapter = new SandboxRailAdapter(makeConfig() as any);
      const rawBody = Buffer.from(JSON.stringify({ foo: 'bar' }));

      expect(() => adapter.parseWebhookPayload(rawBody)).toThrow();
    });

    it('throws on an unrecognized outcome value', () => {
      const adapter = new SandboxRailAdapter(makeConfig() as any);
      const rawBody = Buffer.from(
        JSON.stringify({
          providerReference: 'ref-1',
          outcome: 'not-a-real-outcome',
        }),
      );

      expect(() => adapter.parseWebhookPayload(rawBody)).toThrow();
    });
  });

  describe('verifyByReference', () => {
    it.each([
      ['sandbox_ref_ok', 'confirmed'],
      ['sandbox_fail_ref', 'failed'],
      ['sandbox_pending_ref', 'pending'],
    ])('resolves %s to %s', async (reference, expectedOutcome) => {
      const adapter = new SandboxRailAdapter(makeConfig() as any);
      const result = await adapter.verifyByReference(reference);
      expect(result.outcome).toBe(expectedOutcome);
    });
  });
});
