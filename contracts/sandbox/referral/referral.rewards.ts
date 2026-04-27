// CT-37: Referral reward distribution — pay_referral_reward and set_reward_amount

import { ContractError, ContractState } from './referral.types';
import { ReferralStore } from './referral.register';

/**
 * Admin-only: transfer reward_amount of payment token to the referrer
 * for a given referee's completed qualifying action.
 * Emits a 'reward_paid' event on success.
 */
export function payReferralReward(
  store: ReferralStore,
  state: ContractState,
  caller: string,
  referee: string,
  transfer: (token: string, to: string, amount: bigint) => void,
  emit: (event: string, data: Record<string, unknown>) => void,
): void {
  if (caller !== state.admin) throw new Error(ContractError.Unauthorized);

  const referral = store.referrals.get(referee);
  if (!referral) throw new Error(ContractError.CodeNotFound);

  if (referral.rewardPaid) return;

  if (state.rewardAmount <= 0n) throw new Error(ContractError.InvalidReward);

  transfer(state.paymentToken, referral.referrer, state.rewardAmount);

  referral.rewardPaid = true;

  emit('reward_paid', {
    referee,
    referrer: referral.referrer,
    amount: state.rewardAmount.toString(),
    token: state.paymentToken,
  });
}

/**
 * Admin-only: update the reward amount for future distributions.
 */
export function setRewardAmount(
  state: ContractState,
  caller: string,
  amount: bigint,
): ContractState {
  if (caller !== state.admin) throw new Error(ContractError.Unauthorized);
  if (amount <= 0n) throw new Error(ContractError.InvalidReward);
  return { ...state, rewardAmount: amount };
}
