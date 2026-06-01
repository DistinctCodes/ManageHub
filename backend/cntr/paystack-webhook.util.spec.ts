import * as crypto from 'crypto';
import { verifyPaystackSignature } from './paystack-webhook.util';

describe('verifyPaystackSignature', () => {
  const testSecret = 'sk_test_1234567890abcdef';
  const testBody = '{"event":"charge.success","data":{"amount":50000}}';

  // Pre-compute a valid signature for the test body
  const validSignature = crypto
    .createHmac('sha512', testSecret)
    .update(testBody)
    .digest('hex');

  it('should return true for a valid signature', () => {
    const result = verifyPaystackSignature(testBody, validSignature, testSecret);
    expect(result).toBe(true);
  });

  it('should return false for an invalid signature', () => {
    const invalidSignature =
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const result = verifyPaystackSignature(
      testBody,
      invalidSignature,
      testSecret,
    );
    expect(result).toBe(false);
  });

  it('should return false if signature is empty', () => {
    const result = verifyPaystackSignature(testBody, '', testSecret);
    expect(result).toBe(false);
  });

  it('should return false if secret is empty', () => {
    const result = verifyPaystackSignature(testBody, validSignature, '');
    expect(result).toBe(false);
  });

  it('should return false if both signature and secret are empty', () => {
    const result = verifyPaystackSignature(testBody, '', '');
    expect(result).toBe(false);
  });

  it('should return false if the body has been modified', () => {
    const modifiedBody = testBody.replace('50000', '60000');
    const result = verifyPaystackSignature(
      modifiedBody,
      validSignature,
      testSecret,
    );
    expect(result).toBe(false);
  });

  it('should return false if the secret is wrong', () => {
    const wrongSecret = 'sk_test_wrongsecret';
    const result = verifyPaystackSignature(
      testBody,
      validSignature,
      wrongSecret,
    );
    expect(result).toBe(false);
  });

  it('should return false for malformed signature (invalid hex)', () => {
    const malformedSignature = 'not_valid_hex_at_all';
    const result = verifyPaystackSignature(
      testBody,
      malformedSignature,
      testSecret,
    );
    expect(result).toBe(false);
  });

  it('should handle empty body gracefully', () => {
    const emptyBody = '';
    const emptyBodySignature = crypto
      .createHmac('sha512', testSecret)
      .update(emptyBody)
      .digest('hex');
    const result = verifyPaystackSignature(
      emptyBody,
      emptyBodySignature,
      testSecret,
    );
    expect(result).toBe(true);
  });
});
