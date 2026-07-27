use soroban_sdk::{contracttype, Address, String};

/// Staking tier defining lock duration and reward multiplier.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct StakingTier {
    pub id: String,
    pub name: String,
    pub min_stake_amount: i128,
    pub lock_duration: u64,
    pub reward_multiplier_bps: u32,
    pub base_rate_bps: u32,
}

/// Represents an active stake held by a user.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct StakeInfo {
    pub staker: Address,
    pub amount: i128,
    pub tier_id: String,
    pub staked_at: u64,
    pub unlock_at: u64,
    pub claimed_rewards: i128,
    pub emergency_unstaked: bool,
}

/// Global staking configuration set by admin.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct StakingConfig {
    pub staking_enabled: bool,
    pub emergency_unstake_penalty_bps: u32,
    pub staking_token: Address,
    pub reward_pool: Address,
}
