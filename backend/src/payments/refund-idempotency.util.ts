import { BadRequestException } from '@nestjs/common';

/** #2090: require and normalise an Idempotency-Key header for admin refunds. */
export function requireIdempotencyKey(header?: string): string {
  const key = header?.trim();
  if (!key || key.length > 128) throw new BadRequestException('A valid Idempotency-Key header is required');
  return key;
}

export const refundIdempotencyScope = (paymentId: string, key: string) => `refund:${paymentId}:${key}`;
