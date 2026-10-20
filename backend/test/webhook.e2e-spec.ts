import { createHmac } from 'crypto';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './create-test-app';

/**
 * End-to-end coverage of the raw-body webhook path (issue #1953): the
 * signature is verified over the exact bytes the provider sent, so these
 * tests sign the literal request body (including deliberate whitespace) and
 * assert both accept and reject paths.
 */
describe('Payment webhook (e2e)', () => {
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  const secret = process.env.PAYMENT_WEBHOOK_SECRET as string;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  function sign(rawBody: string): { timestamp: string; signature: string } {
    const timestamp = Date.now().toString();
    const signature = createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');

    return { timestamp, signature };
  }

  it('rejects a missing signature (401)', async () => {
    const res = await request(server)
      .post('/payments/webhooks/sandbox')
      .set('Content-Type', 'application/json')
      .set('X-Payment-Timestamp', Date.now().toString())
      .send(
        JSON.stringify({
          providerReference: 'e2e_missing',
          outcome: 'confirmed',
        }),
      );

    expect(res.status).toBe(401);
  });

  it('rejects an invalid signature (401)', async () => {
    const res = await request(server)
      .post('/payments/webhooks/sandbox')
      .set('Content-Type', 'application/json')
      .set('X-Payment-Timestamp', Date.now().toString())
      .set('X-Payment-Signature', 'deadbeef'.repeat(8))
      .send(
        JSON.stringify({
          providerReference: 'e2e_bad_sig',
          outcome: 'confirmed',
        }),
      );

    expect(res.status).toBe(401);
  });

  it('accepts a correctly signed payload (200)', async () => {
    const rawBody = JSON.stringify({
      providerReference: 'e2e_unknown_reference',
      outcome: 'confirmed',
    });
    const signed = sign(rawBody);

    const res = await request(server)
      .post('/payments/webhooks/sandbox')
      .set('Content-Type', 'application/json')
      .set('X-Payment-Timestamp', signed.timestamp)
      .set('X-Payment-Signature', signed.signature)
      .send(rawBody);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true, contractVersion: '1.0' });
  });

  it('verifies the signature over the exact raw bytes, not a re-serialization', async () => {
    // Spacing that JSON.parse/stringify would strip — this only validates if
    // the app HMACs the raw bytes captured by the body parser.
    const rawBody =
      '{ "providerReference" : "e2e_spaced_reference" , "outcome" : "confirmed" }';
    const signed = sign(rawBody);

    const res = await request(server)
      .post('/payments/webhooks/sandbox')
      .set('Content-Type', 'application/json')
      .set('X-Payment-Timestamp', signed.timestamp)
      .set('X-Payment-Signature', signed.signature)
      .send(rawBody);

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });

  it('rejects a correctly signed but malformed payload (400)', async () => {
    const rawBody = JSON.stringify({ providerReference: 'e2e_malformed' });
    const signed = sign(rawBody);

    const res = await request(server)
      .post('/payments/webhooks/sandbox')
      .set('Content-Type', 'application/json')
      .set('X-Payment-Timestamp', signed.timestamp)
      .set('X-Payment-Signature', signed.signature)
      .send(rawBody);

    expect(res.status).toBe(400);
  });
});
