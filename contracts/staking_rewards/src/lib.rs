#![no_std]
//! # Staking & Rewards Crate
//!
//! Extracted from the ManageHub monolith. Provides staking tier management,
//! token staking/unstaking, penalty calculation, and reward accrual.

mod errors;
mod types;

pub use errors::StakingError;
pub use types::*;

use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, String, Vec};

/// Storage keys for staking.
#[contracttype]
pub enum DataKey {
    Admin,
    Config,
    TierList,
    Tier(String),
    Stake(Address),
}

/// TTL for stake records (~30 days in ledgers at ~5s each).
const STAKE_TTL_LEDGERS: u32 = 518_400;

/// TTL for staking tier records (~90 days in ledgers).
const TIER_TTL_LEDGERS: u32 = 1_555_200;

/// Seconds in a calendar year.
const YEAR_SECS: i128 = 365 * 24 * 60 * 60;

#[contract]
pub struct StakingRewardsContract;

#[contractimpl]
impl StakingRewardsContract {
    /// Initialise or update the global staking configuration. Admin only.
    pub fn set_staking_config(
        env: Env,
        admin: Address,
        config: StakingConfig,
    ) -> Result<(), StakingError> {
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(StakingError::StakingNotConfigured)?;
        stored_admin.require_auth();
        if stored_admin != admin {
            return Err(StakingError::Unauthorized);
        }

        if config.emergency_unstake_penalty_bps > 10_000 {
            return Err(StakingError::InvalidConfig);
        }

        env.storage()
            .instance()
            .set(&DataKey::Config, &config);
        Ok(())
    }

    /// Create a new staking tier. Admin only.
    pub fn create_staking_tier(
        env: Env,
        admin: Address,
        tier: StakingTier,
    ) -> Result<(), StakingError> {
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(StakingError::StakingNotConfigured)?;
        stored_admin.require_auth();
        if stored_admin != admin {
            return Err(StakingError::Unauthorized);
        }

        if tier.min_stake_amount <= 0 {
            return Err(StakingError::BelowMinimumStake);
        }
        if tier.reward_multiplier_bps == 0 {
            return Err(StakingError::InvalidConfig);
        }
        if tier.base_rate_bps == 0 || tier.base_rate_bps > 10_000 {
            return Err(StakingError::InvalidConfig);
        }

        if env
            .storage()
            .persistent()
            .has(&DataKey::Tier(tier.id.clone()))
        {
            return Err(StakingError::TierAlreadyExists);
        }

        env.storage()
            .persistent()
            .set(&DataKey::Tier(tier.id.clone()), &tier);
        env.storage().persistent().extend_ttl(
            &DataKey::Tier(tier.id.clone()),
            TIER_TTL_LEDGERS,
            TIER_TTL_LEDGERS,
        );

        let mut list: Vec<String> = env
            .storage()
            .instance()
            .get(&DataKey::TierList)
            .unwrap_or_else(|| Vec::new(&env));
        list.push_back(tier.id);
        env.storage()
            .instance()
            .set(&DataKey::TierList, &list);

        Ok(())
    }

    /// Lock tokens in a staking tier.
    pub fn stake_tokens(
        env: Env,
        staker: Address,
        tier_id: String,
        amount: i128,
    ) -> Result<(), StakingError> {
        staker.require_auth();

        let config = Self::get_config(&env)?;
        if !config.staking_enabled {
            return Err(StakingError::StakingDisabled);
        }

        let tier = Self::get_tier_internal(&env, &tier_id)?;
        if amount < tier.min_stake_amount {
            return Err(StakingError::BelowMinimumStake);
        }

        let token_client = token::Client::new(&env, &config.staking_token);
        token_client.transfer(&staker, env.current_contract_address(), &amount);

        let now = env.ledger().timestamp();
        let unlock_at = now.checked_add(tier.lock_duration).ok_or(StakingError::Overflow)?;

        let stake = StakeInfo {
            staker: staker.clone(),
            amount,
            tier_id: tier_id.clone(),
            staked_at: now,
            unlock_at,
            claimed_rewards: 0,
            emergency_unstaked: false,
        };

        Self::save_stake(&env, &staker, &stake);
        Ok(())
    }

    /// Unlock tokens after the lock period.
    pub fn unstake_tokens(env: Env, staker: Address) -> Result<(), StakingError> {
        staker.require_auth();

        let config = Self::get_config(&env)?;
        let stake: StakeInfo = env
            .storage()
            .persistent()
            .get(&DataKey::Stake(staker.clone()))
            .ok_or(StakingError::StakeNotFound)?;

        let now = env.ledger().timestamp();
        if now < stake.unlock_at {
            return Err(StakingError::StillLocked);
        }

        let rewards = calculate_pending_rewards(&env, &stake)?;

        let token_client = token::Client::new(&env, &config.staking_token);
        token_client.transfer(&env.current_contract_address(), &staker, &stake.amount);

        if rewards > 0 {
            let reward_client = token::Client::new(&env, &config.reward_pool);
            reward_client.transfer(&env.current_contract_address(), &staker, &rewards);
        }

        env.storage()
            .persistent()
            .remove(&DataKey::Stake(staker));

        Ok(())
    }

    /// Emergency unstake with penalty.
    pub fn emergency_unstake(env: Env, staker: Address) -> Result<(), StakingError> {
        staker.require_auth();

        let config = Self::get_config(&env)?;
        let stake: StakeInfo = env
            .storage()
            .persistent()
            .get(&DataKey::Stake(staker.clone()))
            .ok_or(StakingError::StakeNotFound)?;

        let penalty = stake
            .amount
            .checked_mul(config.emergency_unstake_penalty_bps as i128)
            .ok_or(StakingError::Overflow)?
            .checked_div(10_000)
            .ok_or(StakingError::Overflow)?;

        let amount_returned = stake
            .amount
            .checked_sub(penalty)
            .ok_or(StakingError::Overflow)?;

        let token_client = token::Client::new(&env, &config.staking_token);
        if amount_returned > 0 {
            token_client.transfer(&env.current_contract_address(), &staker, &amount_returned);
        }

        env.storage()
            .persistent()
            .remove(&DataKey::Stake(staker));

        Ok(())
    }

    /// Get active stake for a staker.
    pub fn get_stake_info(env: Env, staker: Address) -> Option<StakeInfo> {
        env.storage()
            .persistent()
            .get(&DataKey::Stake(staker))
    }

    /// Get all staking tiers.
    pub fn get_staking_tiers(env: Env) -> Vec<StakingTier> {
        let list: Vec<String> = env
            .storage()
            .instance()
            .get(&DataKey::TierList)
            .unwrap_or_else(|| Vec::new(&env));

        let mut tiers = Vec::new(&env);
        for id in list.iter() {
            if let Some(tier) = env
                .storage()
                .persistent()
                .get::<DataKey, StakingTier>(&DataKey::Tier(id))
            {
                tiers.push_back(tier);
            }
        }
        tiers
    }

    /// Get global staking configuration.
    pub fn get_staking_config(env: Env) -> Result<StakingConfig, StakingError> {
        Self::get_config(&env)
    }

    fn get_config(env: &Env) -> Result<StakingConfig, StakingError> {
        env.storage()
            .instance()
            .get(&DataKey::Config)
            .ok_or(StakingError::StakingNotConfigured)
    }

    pub(crate) fn get_tier_internal(env: &Env, tier_id: &String) -> Result<StakingTier, StakingError> {
        env.storage()
            .persistent()
            .get(&DataKey::Tier(tier_id.clone()))
            .ok_or(StakingError::TierNotFound)
    }

    fn save_stake(env: &Env, staker: &Address, stake: &StakeInfo) {
        env.storage()
            .persistent()
            .set(&DataKey::Stake(staker.clone()), stake);
        env.storage().persistent().extend_ttl(
            &DataKey::Stake(staker.clone()),
            STAKE_TTL_LEDGERS,
            STAKE_TTL_LEDGERS,
        );
    }
}

/// Calculate pending (unclaimed) rewards for a stake.
///
/// Uses a simple linear model:
/// ```text
/// pending = principal * base_rate_bps / 10_000
///           * elapsed / YEAR_SECS
///           * multiplier_bps / 10_000
///           - claimed_rewards
/// ```
fn calculate_pending_rewards(env: &Env, stake: &StakeInfo) -> Result<i128, StakingError> {
    if stake.emergency_unstaked {
        return Ok(0);
    }

    let tier = StakingRewardsContract::get_tier_internal(env, &stake.tier_id)?;

    let now = env.ledger().timestamp() as i128;
    let staked_at = stake.staked_at as i128;
    let elapsed = now.checked_sub(staked_at).unwrap_or(0).max(0);

    let gross = stake
        .amount
        .checked_mul(tier.base_rate_bps as i128)
        .ok_or(StakingError::Overflow)?
        .checked_mul(elapsed)
        .ok_or(StakingError::Overflow)?
        .checked_mul(tier.reward_multiplier_bps as i128)
        .ok_or(StakingError::Overflow)?
        .checked_div(
            10_000i128
                .checked_mul(YEAR_SECS)
                .ok_or(StakingError::Overflow)?,
        )
        .ok_or(StakingError::Overflow)?
        .checked_div(10_000)
        .ok_or(StakingError::Overflow)?;

    let pending = gross
        .checked_sub(stake.claimed_rewards)
        .unwrap_or(0)
        .max(0);

    Ok(pending)
}
