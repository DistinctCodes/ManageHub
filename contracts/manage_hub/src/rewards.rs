//! Reward calculation helpers for the token staking module.
//!
//! Rewards are calculated using a simple linear model:
//!
//! ```text
//! pending_rewards = principal
//!                   * base_rate_bps / 10_000      (annual rate)
//!                   * elapsed_seconds / YEAR_SECS  (time fraction)
//!                   * reward_multiplier_bps / 10_000
//!                 - already_claimed_rewards
//! ```
//!
//! All intermediate multiplications use `i128` and `checked_*` to avoid
//! silent overflows.

use crate::errors::Error;
use crate::staking::StakingModule;
use crate::staking_errors::StakingError;
use crate::types::StakeInfo;
use soroban_sdk::Env;

/// Seconds in a calendar year (365 days).
const YEAR_SECS: i128 = 365 * 24 * 60 * 60;

pub struct RewardsModule;

impl RewardsModule {
    /// Calculate pending (unclaimed) rewards for a stake as of now.
    ///
    /// Returns `0` if the stake was emergency-unstaked.
    pub fn calculate_pending_rewards(env: &Env, stake: &StakeInfo) -> Result<i128, Error> {
        if stake.emergency_unstaked {
            return Ok(0);
        }

        let tier = StakingModule::get_tier_internal(env, &stake.tier_id)?;

        let now = env.ledger().timestamp() as i128;
        let staked_at = stake.staked_at as i128;
        let elapsed = now.checked_sub(staked_at).unwrap_or(0).max(0);

        // gross = principal * base_rate_bps * elapsed * multiplier_bps
        //         / (10_000 * YEAR_SECS * 10_000)
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

        let pending = gross.checked_sub(stake.claimed_rewards).unwrap_or(0).max(0);

        Ok(pending)
    }
}
