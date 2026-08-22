import { createHash } from 'crypto';

/**
 * Derives the on-chain escrow_id deterministically from a Payment's UUID,
 * so there is always exactly one queryable link between a Payment row and
 * its on-chain record (issue #1574) — no separate mapping table, no extra
 * unique constraint needed: Payment#id is already the primary key, and
 * this is a pure function of it.
 *
 * The escrow contract's `create` takes a `BytesN<32>` id — sha256 gives us
 * a fixed 32-byte value from an arbitrary-length input (a UUID string).
 */
export function deriveEscrowId(paymentId: string): Buffer {
  return createHash('sha256').update(paymentId, 'utf8').digest();
}

export function escrowIdToHex(paymentId: string): string {
  return deriveEscrowId(paymentId).toString('hex');
}
