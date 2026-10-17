/**
 * Canonical message a user must sign to link an external wallet (issue
 * #1946).
 *
 * The previous flow signed the bare 64-character nonce. That gave the user
 * nothing meaningful to review in their wallet, and a site that can get a
 * wallet to sign an arbitrary hex string could obtain a valid link
 * signature. The structured message adds app/domain separation plus the
 * user, the requested address and the expiry, so the wallet UI shows what
 * is actually being authorised and a signature made for one user or
 * address cannot be replayed for another.
 *
 * The exact same string is returned by the challenge endpoint and rebuilt
 * at verification time — any drift between the two would make every link
 * fail, so both call `buildWalletLinkMessage`.
 */
export interface WalletLinkMessageInput {
  userId: string;
  /** Omitted for a legacy, unbound challenge. */
  address?: string | null;
  nonce: string;
  expiresAt: Date;
}

export const WALLET_LINK_MESSAGE_PREFIX = 'ManageHub wallet link';

export function buildWalletLinkMessage(input: WalletLinkMessageInput): string {
  const lines = [WALLET_LINK_MESSAGE_PREFIX, `user:${input.userId}`];
  if (input.address) {
    lines.push(`address:${input.address}`);
  }
  lines.push(
    `nonce:${input.nonce}`,
    `expires:${input.expiresAt.toISOString()}`,
  );
  return lines.join('\n');
}
