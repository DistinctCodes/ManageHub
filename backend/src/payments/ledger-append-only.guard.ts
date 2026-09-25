// Service-layer guard for ledger.service.ts: ledger rows are append-only
// by design, so this explicitly rejects any attempt to mutate an
// existing row rather than relying solely on DB permissions.
export class LedgerMutationNotAllowedError extends Error {
  constructor(entryId: string) {
    super(`Ledger entry "${entryId}" is append-only and cannot be modified`);
  }
}

export function assertLedgerEntryNotMutated(
  existingEntryId: string | undefined,
): void {
  if (existingEntryId) {
    throw new LedgerMutationNotAllowedError(existingEntryId);
  }
}

export function assertLedgerEntryNotDeleted(entryId: string): never {
  throw new LedgerMutationNotAllowedError(entryId);
}
