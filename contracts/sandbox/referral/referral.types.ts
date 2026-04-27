// CT-34: Referral contract types — ReferralCode, Referral, Reward, DataKey, errors

export interface ReferralCode {
  code: string;
  referrer: string;
  createdAt: number;
  totalUses: number;
}

export interface Referral {
  code: string;
  referrer: string;
  referee: string;
  registeredAt: number;
  rewardPaid: boolean;
}

export interface Reward {
  amount: bigint;
  token: string;
}

export enum DataKey {
  Admin = 'Admin',
  PaymentToken = 'PaymentToken',
  ReferralReward = 'ReferralReward',
  Code = 'Code',
  AddressCode = 'AddressCode',
  ReferralRecord = 'ReferralRecord',
  ReferralList = 'ReferralList',
}

export enum ContractError {
  AdminNotSet = 'AdminNotSet',
  AlreadyInitialized = 'AlreadyInitialized',
  Unauthorized = 'Unauthorized',
  CodeNotFound = 'CodeNotFound',
  CodeAlreadyExists = 'CodeAlreadyExists',
  AlreadyReferred = 'AlreadyReferred',
  InvalidReward = 'InvalidReward',
  SelfReferral = 'SelfReferral',
}

export interface ContractState {
  admin: string;
  paymentToken: string;
  rewardAmount: bigint;
}

/** Stub: initialize the referral contract */
export function initialize(state: ContractState, rewardAmount: bigint): ContractState {
  if (rewardAmount <= 0n) throw new Error(ContractError.InvalidReward);
  return { ...state, rewardAmount };
}
