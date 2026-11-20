import { ConflictException } from '@nestjs/common';

/** #2109: frozen accounts of any type (not just USER) cannot be posted to. */
export function assertAccountNotFrozen(account: { id: string; frozen?: boolean }): void {
  if (account.frozen) throw new ConflictException(`Ledger account ${account.id} is frozen`);
}

/** #2106: apply the currency filter to entries too, and page through them in batches. */
export const INTEGRITY_BATCH_SIZE = 1000;
export const integrityEntryWhere = (currency?: string) => (currency ? { currency } : {});
