//! Staking-related error types for the ManageHub contract.
//!
//! A dedicated `StakingError` enum is used because the main `Error` enum is
//! already at the 50-variant XDR limit imposed by `#[contracterror]`.
//!
//! The [`From`] impl bridges `StakingError` into `Error` (reusing existing
//! numeric codes) so that `?` propagation works in functions returning
//! `Result<_, Error>`.

use crate::errors::Error;

/// Staking-specific errors.
#[derive(Debug)]
pub enum StakingError {
    /// Staking is currently disabled by the admin.
    StakingDisabled,
    /// No active stake found for this staker.
    StakeNotFound,
    /// The lock period has not elapsed yet; use emergency_unstake if urgent.
    StillLocked,
    /// The requested staking tier does not exist.
    TierNotFound,
    /// The stake amount is below the minimum for the chosen tier.
    BelowMinimumStake,
    /// Staking configuration has not been initialised.
    StakingNotConfigured,
    /// Arithmetic overflow during reward calculation.
    Overflow,
}

impl From<StakingError> for Error {
    fn from(e: StakingError) -> Self {
        match e {
            StakingError::StakingDisabled => Error::SubscriptionNotActive,
            StakingError::StakeNotFound => Error::TokenNotFound,
            StakingError::StillLocked => Error::PauseTooEarly,
            StakingError::TierNotFound => Error::TierNotFound,
            StakingError::BelowMinimumStake => Error::InvalidPaymentAmount,
            StakingError::StakingNotConfigured => Error::AdminNotSet,
            StakingError::Overflow => Error::TimestampOverflow,
        }
    }
}
