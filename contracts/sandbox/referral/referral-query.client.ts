// CT-38: Referral query functions — TypeScript client for the referral contract

export interface ReferralCode {
  code: string;
  referrer: string;
  usageCount: number;
  createdAt: number;
}

export interface Referral {
  referee: string;
  referrer: string;
  usedCode: string;
  rewardPaid: boolean;
  timestamp: number;
}

export class ReferralQueryClient {
  constructor(private readonly contractId: string) {}

  /** Returns details for a given referral code */
  async getCode(code: string): Promise<ReferralCode | null> {
    return this.call('get_code', { code });
  }

  /** Returns the referral code owned by a referrer address */
  async getReferrerCode(referrer: string): Promise<string | null> {
    return this.call('get_referrer_code', { referrer });
  }

  /** Returns the referral record for a given referee address */
  async getReferral(referee: string): Promise<Referral | null> {
    return this.call('get_referral', { referee });
  }

  /** Returns the current configured reward amount */
  async getRewardAmount(): Promise<bigint> {
    return this.call('get_reward_amount', {});
  }

  private async call<T>(method: string, args: Record<string, unknown>): Promise<T> {
    // Placeholder: replace with actual Stellar SDK invocation
    console.log(`[ReferralQueryClient] ${this.contractId}.${method}`, args);
    return null as unknown as T;
  }
}
