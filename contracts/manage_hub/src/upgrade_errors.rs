//! Upgrade-related error types for the ManageHub contract.
//!
//! A dedicated `UpgradeError` enum is used because the main `Error` enum is
//! already at the 50-variant XDR limit imposed by `#[contracterror]`.
//!
//! The [`From`] impl bridges `UpgradeError` into `Error` (reusing existing
//! numeric codes) so that `?` propagation works in functions returning
//! `Result<_, Error>`.

use crate::errors::Error;

/// Upgrade-specific errors.
#[derive(Debug)]
pub enum UpgradeError {
    /// Token upgrades are currently disabled by the admin.
    UpgradesDisabled,
    /// The specified token does not exist.
    TokenNotFound,
    /// Caller is not authorized to perform this upgrade.
    Unauthorized,
    /// Upgrade configuration has not been initialised.
    UpgradeNotConfigured,
    /// No upgrade history found; cannot rollback.
    NoUpgradeHistory,
    /// Maximum rollback limit has been reached for this token.
    RollbackLimitExceeded,
    /// Arithmetic overflow during upgrade processing.
    Overflow,
}

impl From<UpgradeError> for Error {
    fn from(e: UpgradeError) -> Self {
        match e {
            UpgradeError::UpgradesDisabled => Error::SubscriptionNotActive,
            UpgradeError::TokenNotFound => Error::TokenNotFound,
            UpgradeError::Unauthorized => Error::Unauthorized,
            UpgradeError::UpgradeNotConfigured => Error::AdminNotSet,
            UpgradeError::NoUpgradeHistory => Error::MetadataNotFound,
            UpgradeError::RollbackLimitExceeded => Error::PauseCountExceeded,
            UpgradeError::Overflow => Error::TimestampOverflow,
        }
    }
}
