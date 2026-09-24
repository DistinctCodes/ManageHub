// Admin-only key rotation helper for wallets/key-custody, recording the
// rotation in admin-audit as it happens.
export interface AdminAuditRecorder {
  record(entry: { action: string; adminId: string; walletId: string }): Promise<void>;
}

export interface KeyRotationResult {
  walletId: string;
  rotatedAt: Date;
}

export async function rotateWalletKey(
  walletId: string,
  adminId: string,
  regenerateKey: (walletId: string) => Promise<void>,
  audit: AdminAuditRecorder,
): Promise<KeyRotationResult> {
  await regenerateKey(walletId);
  await audit.record({
    action: 'WALLET_KEY_ROTATION',
    adminId,
    walletId,
  });
  return { walletId, rotatedAt: new Date() };
}
