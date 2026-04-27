// CT-36: Referral tracking and validation — use_referral_code logic

import { Referral, ContractError } from './referral.types';
import { ReferralStore } from './referral.register';

/**
 * Link a referee to a referrer via a referral code.
 * Validates code existence, self-referral, and duplicate usage.
 * Emits a 'referral_used' event on success.
 */
export function useReferralCode(
  store: ReferralStore,
  referee: string,
  code: string,
  emit: (event: string, data: Record<string, unknown>) => void,
): Referral {
  if (!referee) throw new Error(ContractError.Unauthorized);

  const referralCode = store.codes.get(code);
  if (!referralCode) throw new Error(ContractError.CodeNotFound);

  if (referralCode.referrer === referee) {
    throw new Error(ContractError.SelfReferral);
  }

  if (store.referrals.has(referee)) {
    throw new Error(ContractError.AlreadyReferred);
  }

  const record: Referral = {
    code,
    referrer: referralCode.referrer,
    referee,
    registeredAt: Date.now(),
    rewardPaid: false,
  };

  store.referrals.set(referee, record);
  referralCode.totalUses += 1;

  emit('referral_used', {
    referee,
    referrer: referralCode.referrer,
    code,
    totalUses: referralCode.totalUses,
  });

  return record;
}

export function getReferral(store: ReferralStore, referee: string): Referral | null {
  return store.referrals.get(referee) ?? null;
}
