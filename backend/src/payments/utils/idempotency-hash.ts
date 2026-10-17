import { createHash } from 'crypto';
import { InitiatePaymentDto } from '../dto/initiate-payment.dto';

/**
 * Deterministic JSON serialisation: object keys are sorted at every level
 * so two semantically equal bodies that differ only in key order hash to
 * the same value. Without this, a client that reorders `metadata` on a
 * retry would look like a different request and be rejected (issue #1968).
 */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([left], [right]) => (left < right ? -1 : left > right ? 1 : 0),
    );
    return entries.reduce<Record<string, unknown>>((acc, [key, entry]) => {
      acc[key] = canonicalize(entry);
      return acc;
    }, {});
  }
  return value;
}

/**
 * Stable SHA-256 over the fields that define a payment initiation. Stored
 * on the Payment so an `Idempotency-Key` reused with a different body is
 * rejected (422) instead of silently replaying the original payment.
 */
export function hashPaymentRequest(dto: InitiatePaymentDto): string {
  const body = {
    bookingId: dto.bookingId,
    amount: dto.amount,
    currency:
      typeof dto.currency === 'string'
        ? dto.currency.toUpperCase()
        : dto.currency,
    rail: dto.rail,
    provider: dto.provider ?? null,
    metadata: dto.metadata ?? null,
  };
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(body)))
    .digest('hex');
}
