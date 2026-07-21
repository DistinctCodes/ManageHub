//! # Pause Guard Middleware
//!
//! Provides reusable guard functions that enforce pause state for token operations.
//! Guards are designed to be called at the top of any function that should be
//! blocked when the contract or a specific token is paused.
//!
//! | Guard                       | Error returned                  |
//! |-----------------------------|---------------------------------|
//! | `require_not_paused`        | `PauseError::ContractPaused`    |
//! | `require_token_not_paused`  | `PauseError::TokenOpsPaused`    |
//! | `require_timelock_expired`  | `PauseError::TimeLockActive`    |
//!
//! [`crate::pause_errors`] provides a [`From`] impl that bridges `PauseError`
//! into `Error` so that `?` propagation works in functions returning
//! `Result<_, Error>`.
//!
//! ## Usage
//!
//! ```rust,ignore
//! // Block any operation when contract is globally paused:
//! PauseGuard::require_not_paused(&env)?;
//!
//! // Block a specific token's operations:
//! PauseGuard::require_token_not_paused(&env, &token_id)?;
//!
//! // Check whether the time lock has expired before allowing manual unpause:
//! PauseGuard::require_timelock_expired(&env)?;
//! ```

use crate::membership_token::DataKey;
use crate::pause_errors::PauseError;
use crate::types::{EmergencyPauseState, TokenPauseState};
use soroban_sdk::{BytesN, Env};

pub struct PauseGuard;

impl PauseGuard {
    /// Returns `Err(PauseError::ContractPaused)` if the contract is globally paused.
    ///
    /// Also handles automatic expiry: if `auto_unpause_at` is set and the
    /// current ledger timestamp is at or past that value, the guard treats
    /// the contract as unpaused without requiring a storage write.
    ///
    /// In functions returning `Result<(), Error>` the `?` operator
    /// auto-converts via [`From<PauseError> for Error`].
    pub fn require_not_paused(env: &Env) -> Result<(), PauseError> {
        let state: Option<EmergencyPauseState> =
            env.storage().instance().get(&DataKey::EmergencyPauseState);

        if let Some(state) = state {
            if state.is_paused {
                // Check whether the auto-unpause deadline has passed.
                if let Some(auto_unpause_at) = state.auto_unpause_at {
                    if env.ledger().timestamp() >= auto_unpause_at {
                        return Ok(()); // Automatic unpause has taken effect.
                    }
                }
                return Err(PauseError::ContractPaused);
            }
        }

        Ok(())
    }

    /// Returns `Err(PauseError::TokenOpsPaused)` if the specific token is paused.
    ///
    /// This check is independent of the global pause: a token can be paused
    /// while the contract is running normally. Both checks should be applied
    /// where relevant.
    pub fn require_token_not_paused(env: &Env, token_id: &BytesN<32>) -> Result<(), PauseError> {
        let state: Option<TokenPauseState> = env
            .storage()
            .persistent()
            .get(&DataKey::TokenPaused(token_id.clone()));

        if let Some(state) = state {
            if state.is_paused {
                return Err(PauseError::TokenOpsPaused);
            }
        }

        Ok(())
    }

    /// Returns `Err(PauseError::TimeLockActive)` if the emergency time lock is still active.
    ///
    /// Should be called before any admin-initiated unpause to ensure the minimum
    /// lock window enforced at pause time has passed.
    pub fn require_timelock_expired(env: &Env) -> Result<(), PauseError> {
        let state: Option<EmergencyPauseState> =
            env.storage().instance().get(&DataKey::EmergencyPauseState);

        if let Some(state) = state {
            if let Some(time_lock_until) = state.time_lock_until {
                if env.ledger().timestamp() < time_lock_until {
                    return Err(PauseError::TimeLockActive);
                }
            }
        }

        Ok(())
    }

    /// Returns the current global pause state, or a default (unpaused) state
    /// if no pause has ever been initiated.
    pub fn get_pause_state(env: &Env) -> EmergencyPauseState {
        env.storage()
            .instance()
            .get(&DataKey::EmergencyPauseState)
            .unwrap_or(EmergencyPauseState {
                is_paused: false,
                paused_at: None,
                paused_by: None,
                reason: None,
                auto_unpause_at: None,
                time_lock_until: None,
                pause_count: 0,
            })
    }

    /// Returns `true` if the contract is currently paused (respecting auto-unpause).
    pub fn is_paused(env: &Env) -> bool {
        Self::require_not_paused(env).is_err()
    }

    /// Returns `true` if the specific token's operations are currently paused.
    pub fn is_token_paused(env: &Env, token_id: &BytesN<32>) -> bool {
        Self::require_token_not_paused(env, token_id).is_err()
    }
}
