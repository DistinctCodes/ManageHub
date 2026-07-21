//! Pause-related error types for the ManageHub contract.
//!
//! A dedicated `PauseError` enum (separate from the main `Error` enum) is used
//! because `#[contracterror]` enforces a hard 50-variant XDR limit and the main
//! `Error` enum is already at that limit.
//!
//! The [`From`] impl bridges `PauseError` into `Error` so that `?` propagation
//! works transparently in functions that return `Result<_, Error>`.

use crate::errors::Error;

/// Pause-specific errors returned by [`crate::guards::PauseGuard`].
#[derive(Debug)]
pub enum PauseError {
    /// The contract is currently paused; all token operations are blocked.
    ContractPaused,
    /// This token's operations are currently paused independently of the global pause.
    TokenOpsPaused,
    /// The mandatory time-lock window has not yet elapsed; manual unpause is not allowed.
    TimeLockActive,
}

/// Bridges `PauseError` into the main [`Error`] enum so that `?` works in
/// functions returning `Result<_, Error>`.
impl From<PauseError> for Error {
    fn from(e: PauseError) -> Self {
        match e {
            PauseError::ContractPaused | PauseError::TokenOpsPaused => Error::SubscriptionPaused,
            PauseError::TimeLockActive => Error::PauseTooEarly,
        }
    }
}
