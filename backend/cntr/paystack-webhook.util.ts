import * as crypto from 'crypto';

/**
 * Verifies the Paystack webhook signature using HMAC-SHA512 and constant-time comparison.
 *
 * @param rawBody - The raw request body (string)
 * @param signature - The signature from the X-Paystack-Signature header
 * @param secret - The Paystack secret key
 * @returns true if the signature is valid, false otherwise
 */
export function verifyPaystackSignature(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  // Return false if signature or secret is empty
  if (!signature || !secret) {
    return false;
  }

  try {
    // Compute the expected hash
    const hash = crypto
      .createHmac('sha512', secret)
      .update(rawBody)
      .digest('hex');

    // Convert both to buffers for constant-time comparison
    const signatureBuffer = Buffer.from(signature, 'hex');
    const hashBuffer = Buffer.from(hash, 'hex');

    // Use timingSafeEqual to prevent timing attacks
    return crypto.timingSafeEqual(signatureBuffer, hashBuffer);
  } catch (error) {
    // If any error occurs during verification (e.g., invalid hex), return false
    return false;
  }
}
