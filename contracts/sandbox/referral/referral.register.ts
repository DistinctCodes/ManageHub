// CT-35: Referral code registration — register_code logic

import { ReferralCode, Referral, DataKey, ContractError } from './referral.types';

export interface ReferralStore {
  codes: Map<string, ReferralCode>;
  addressCodes: Map<string, string>;
  referrals: Map<string, Referral>;
}

export function createStore(): ReferralStore {
  return { codes: new Map(), addressCodes: new Map(), referrals: new Map() };
}

/**
 * Register a unique referral code for a referrer address.
 * Emits a 'code_registered' event on success.
 */
export function registerCode(
  store: ReferralStore,
  referrer: string,
  code: string,
  emit: (event: string, data: Record<string, unknown>) => void,
): ReferralCode {
  if (!referrer) throw new Error(ContractError.Unauthorized);

  if (store.codes.has(code)) {
    throw new Error(ContractError.CodeAlreadyExists);
  }

  if (store.addressCodes.has(referrer)) {
    throw new Error(ContractError.CodeAlreadyExists);
  }

  const record: ReferralCode = {
    code,
    referrer,
    createdAt: Date.now(),
    totalUses: 0,
  };

  store.codes.set(code, record);
  store.addressCodes.set(referrer, code);

  emit('code_registered', { referrer, code, createdAt: record.createdAt });

  return record;
}

export function getCodeByAddress(store: ReferralStore, referrer: string): string | null {
  return store.addressCodes.get(referrer) ?? null;
}

export function getCode(store: ReferralStore, code: string): ReferralCode | null {
  return store.codes.get(code) ?? null;
}
