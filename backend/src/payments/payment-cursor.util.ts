import { BadRequestException } from '@nestjs/common';
import { Payment } from './entities/payment.entity';

export const PAYMENT_PAGE_DEFAULT_LIMIT = 25;
export const PAYMENT_PAGE_MAX_LIMIT = 100;

export interface PaymentListOptions {
  limit?: number;
  cursor?: string;
  status?: string;
  from?: string;
  to?: string;
}

export interface PaymentCursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export function encodePaymentCursor(payment: Payment): string {
  return Buffer.from(
    `${payment.createdAt.toISOString()}|${payment.id}`,
    'utf8',
  ).toString('base64url');
}

export function decodePaymentCursor(cursor: string): {
  createdAt: Date;
  id: string;
} {
  const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
  const separator = decoded.lastIndexOf('|');
  const rawCreatedAt = separator === -1 ? '' : decoded.slice(0, separator);
  const id = separator === -1 ? '' : decoded.slice(separator + 1);
  const createdAt = new Date(rawCreatedAt);

  if (!id || Number.isNaN(createdAt.getTime())) {
    throw new BadRequestException('cursor is not a valid pagination cursor');
  }
  return { createdAt, id };
}
