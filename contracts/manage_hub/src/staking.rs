#![allow(deprecated)]

use crate::errors::Error;
use crate::membership_token::DataKey as MembershipDataKey;
use crate::staking_errors::StakingError;
use crate::types::{StakeInfo, StakingConfig, StakingTier};
use soroban_sdk::{contracttype, token, Address, Env, String, Vec};

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

#[contracttype]
pub enum StakingDataKey {
    /// Global staking configuration (instance storage).
    Config,
    /// All staking tier IDs (instance storage).
    TierList,
    /// Individual staking tier by ID (persistent storage).
    Tier(String),
    /// Active stake per staker address (persistent storage).
    Stake(Address),
}

// ---------------------------------------------------------------------------
// TTL constants (in ledgers; Stellar produces ~1 ledger / 5 s)
// ---------------------------------------------------------------------------

/// Keep stake records for ~30 days.
const STAKE_TTL_LEDGERS: u32 = 518_400;

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

pub struct StakingModule;

impl StakingModule {
    // -----------------------------------------------------------------------
    // Admin – configuration
    // -----------------------------------------------------------------------

    /// Initialise or update the global staking configuration. Admin only.
    pub fn set_staking_config(
        env: Env,
        admin: Address,
        config: StakingConfig,
    ) -> Result<(), Error> {
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&MembershipDataKey::Admin)
            .ok_or(Error::AdminNotSet)?;
        stored_admin.require_auth();
        if stored_admin != admin {
            return Err(Error::Unauthorized);
        }

        if config.emergency_unstake_penalty_bps > 10_000 {
            return Err(Error::InvalidPaymentAmount);
        }

        env.storage()
            .instance()
            .set(&StakingDataKey::Config, &config);
        Ok(())
    }

    /// Create a new staking tier. Admin only.
    pub fn create_staking_tier(env: Env, admin: Address, tier: StakingTier) -> Result<(), Error> {
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&MembershipDataKey::Admin)
            .ok_or(Error::AdminNotSet)?;
        stored_admin.require_auth();
        if stored_admin != admin {
            return Err(Error::Unauthorized);
        }

        if tier.min_stake_amount <= 0 {
            return Err(Error::InvalidPaymentAmount);
        }
        if tier.reward_multiplier_bps == 0 {
            return Err(Error::InvalidPaymentAmount);
        }
        if tier.base_rate_bps == 0 || tier.base_rate_bps > 10_000 {
            return Err(Error::InvalidPaymentAmount);
        }

        if env
            .storage()
            .persistent()
            .has(&StakingDataKey::Tier(tier.id.clone()))
        {
            return Err(Error::TierAlreadyExists);
        }

        env.storage()
            .persistent()
            .set(&StakingDataKey::Tier(tier.id.clone()), &tier);

        // Append tier ID to the tier list.
        let mut list: Vec<String> = env
            .storage()
            .instance()
            .get(&StakingDataKey::TierList)
            .unwrap_or_else(|| Vec::new(&env));
        list.push_back(tier.id.clone());
        env.storage()
            .instance()
            .set(&StakingDataKey::TierList, &list);

        env.events().publish(
            (
                String::from_str(&env, "StakingTierCreated"),
                tier.id.clone(),
            ),
            env.ledger().timestamp(),
        );

        Ok(())
    }

    // -----------------------------------------------------------------------
    // User – stake / unstake
    // -----------------------------------------------------------------------

    /// Lock `amount` tokens in the specified staking tier.
    ///
    /// Emits: `Staked(staker, amount, tier_id, unlock_at)`
    pub fn stake_tokens(
        env: Env,
        staker: Address,
        tier_id: String,
        amount: i128,
    ) -> Result<(), Error> {
        staker.require_auth();

        let config = Self::get_config(&env)?;
        if !config.staking_enabled {
            return Err(StakingError::StakingDisabled.into());
        }

        let tier = Self::get_tier_internal(&env, &tier_id)?;

        if amount < tier.min_stake_amount {
            return Err(StakingError::BelowMinimumStake.into());
        }

        // Only one active stake per user (can be extended by re-staking
        // after a proper unstake).
        if env
            .storage()
            .persistent()
            .has(&StakingDataKey::Stake(staker.clone()))
        {
            // Allow adding to an existing stake: accumulate rewards first.
            let existing: StakeInfo = env
                .storage()
                .persistent()
                .get(&StakingDataKey::Stake(staker.clone()))
                .ok_or(Error::TokenNotFound)?;

            // Require the existing stake to use the same tier.
            if existing.tier_id != tier_id {
                return Err(Error::Unauthorized);
            }

            // Pull tokens from user.
            let token_client = token::Client::new(&env, &config.staking_token);
            token_client.transfer(&staker, env.current_contract_address(), &amount);

            let new_amount = existing
                .amount
                .checked_add(amount)
                .ok_or(StakingError::Overflow)?;

            let now = env.ledger().timestamp();
            let unlock_at = now
                .checked_add(tier.lock_duration)
                .ok_or(StakingError::Overflow)?;

            let updated = StakeInfo {
                staker: staker.clone(),
                amount: new_amount,
                tier_id: tier_id.clone(),
                staked_at: existing.staked_at,
                unlock_at,
                claimed_rewards: existing.claimed_rewards,
                emergency_unstaked: false,
            };

            Self::save_stake(&env, &staker, &updated);

            env.events().publish(
                (String::from_str(&env, "Staked"), staker.clone(), tier_id),
                (new_amount, unlock_at),
            );

            return Ok(());
        }

        // New stake.
        let token_client = token::Client::new(&env, &config.staking_token);
        token_client.transfer(&staker, env.current_contract_address(), &amount);

        let now = env.ledger().timestamp();
        let unlock_at = now
            .checked_add(tier.lock_duration)
            .ok_or(StakingError::Overflow)?;

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

        env.events().publish(
            (String::from_str(&env, "Staked"), staker.clone(), tier_id),
            (amount, unlock_at),
        );

        Ok(())
    }

    /// Unlock tokens after the lock period has elapsed.
    ///
    /// Pending rewards are calculated and transferred together with the
    /// principal amount.
    ///
    /// Emits: `Unstaked(staker, amount, rewards)`
    pub fn unstake_tokens(env: Env, staker: Address) -> Result<(), Error> {
        staker.require_auth();

        let config = Self::get_config(&env)?;

        let stake: StakeInfo = env
            .storage()
            .persistent()
            .get(&StakingDataKey::Stake(staker.clone()))
            .ok_or(StakingError::StakeNotFound)?;

        let now = env.ledger().timestamp();
        if now < stake.unlock_at {
            return Err(StakingError::StillLocked.into());
        }

        let rewards = crate::rewards::RewardsModule::calculate_pending_rewards(&env, &stake)?;

        // Return principal.
        let token_client = token::Client::new(&env, &config.staking_token);
        token_client.transfer(&env.current_contract_address(), &staker, &stake.amount);

        // Distribute rewards from reward pool.
        if rewards > 0 {
            let reward_client = token::Client::new(&env, &config.reward_pool);
            reward_client.transfer(&env.current_contract_address(), &staker, &rewards);
        }

        // Clean up stake record.
        env.storage()
            .persistent()
            .remove(&StakingDataKey::Stake(staker.clone()));

        env.events().publish(
            (String::from_str(&env, "Unstaked"), staker.clone()),
            (stake.amount, rewards),
        );

        Ok(())
    }

    /// Emergency unstake: unlock tokens immediately, forfeiting a penalty.
    ///
    /// The penalty is burned / kept in the contract; the remainder is returned
    /// to the staker. No rewards are paid.
    ///
    /// Emits: `EmergencyUnstaked(staker, amount_returned, penalty)`
    pub fn emergency_unstake(env: Env, staker: Address) -> Result<(), Error> {
        staker.require_auth();

        let config = Self::get_config(&env)?;

        let stake: StakeInfo = env
            .storage()
            .persistent()
            .get(&StakingDataKey::Stake(staker.clone()))
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

        // Return principal minus penalty to staker.
        if amount_returned > 0 {
            token_client.transfer(&env.current_contract_address(), &staker, &amount_returned);
        }

        // Penalty stays in the contract (acts as a disincentive).

        // Clean up stake record.
        env.storage()
            .persistent()
            .remove(&StakingDataKey::Stake(staker.clone()));

        env.events().publish(
            (String::from_str(&env, "EmergencyUnstaked"), staker.clone()),
            (amount_returned, penalty),
        );

        Ok(())
    }

    // -----------------------------------------------------------------------
    // Queries
    // -----------------------------------------------------------------------

    /// Return the active stake for a staker, or `None` if not staking.
    pub fn get_stake_info(env: Env, staker: Address) -> Option<StakeInfo> {
        env.storage()
            .persistent()
            .get(&StakingDataKey::Stake(staker))
    }

    /// Return all available staking tiers.
    pub fn get_staking_tiers(env: Env) -> Vec<StakingTier> {
        let list: Vec<String> = env
            .storage()
            .instance()
            .get(&StakingDataKey::TierList)
            .unwrap_or_else(|| Vec::new(&env));

        let mut tiers = Vec::new(&env);
        for id in list.iter() {
            if let Some(tier) = env
                .storage()
                .persistent()
                .get::<StakingDataKey, StakingTier>(&StakingDataKey::Tier(id))
            {
                tiers.push_back(tier);
            }
        }
        tiers
    }

    /// Return the global staking configuration.
    pub fn get_staking_config(env: Env) -> Result<StakingConfig, Error> {
        Self::get_config(&env)
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    fn get_config(env: &Env) -> Result<StakingConfig, Error> {
        env.storage()
            .instance()
            .get(&StakingDataKey::Config)
            .ok_or(StakingError::StakingNotConfigured.into())
    }

    pub(crate) fn get_tier_internal(env: &Env, tier_id: &String) -> Result<StakingTier, Error> {
        env.storage()
            .persistent()
            .get(&StakingDataKey::Tier(tier_id.clone()))
            .ok_or(StakingError::TierNotFound.into())
    }

    fn save_stake(env: &Env, staker: &Address, stake: &StakeInfo) {
        env.storage()
            .persistent()
            .set(&StakingDataKey::Stake(staker.clone()), stake);
        env.storage().persistent().extend_ttl(
            &StakingDataKey::Stake(staker.clone()),
            STAKE_TTL_LEDGERS,
            STAKE_TTL_LEDGERS,
        );
    }
}
