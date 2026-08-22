/**
 * Mirrors the escrow contract's own on-chain status (see the reference
 * ABI documented in escrow-contract.client.ts). This is read fresh from
 * the chain, never inferred from a submission response.
 */
export enum EscrowStatus {
  NOT_FOUND = 'NOT_FOUND',
  LOCKED = 'LOCKED',
  RELEASED = 'RELEASED',
  REFUNDED = 'REFUNDED',
}
