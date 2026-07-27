#![no_std]
//! # Membership Token Crate
//!
//! Expanded membership token contract extracted from the ManageHub monolith.
//! Provides token issuance, transfer, metadata, renewal, allowance,
//! and fractionalization features.

mod errors;
mod types;

pub use errors::Error;
pub use types::*;

use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env, Map, String, Vec};

/// Keep membership tokens and their metadata for ~90 days (in ledgers).
const TOKEN_TTL_LEDGERS: u32 = 1_555_200;

/// Storage keys for the membership token contract.
#[contracttype]
pub enum DataKey {
    Token(BytesN<32>),
    Admin,
    Metadata(BytesN<32>),
    MetadataHistory(BytesN<32>),
    MetadataIndex(String, MetadataValue),
    RenewalConfig,
    RenewalHistory(BytesN<32>),
    AutoRenewalSettings(Address),
    EmergencyPauseState,
    TokenPaused(BytesN<32>),
    UpgradeConfig,
    UpgradeHistory(BytesN<32>),
    VersionSnapshot(BytesN<32>, u32),
    Royalty(BytesN<32>),
    Allowance(BytesN<32>, Address, Address),
}

/// Core membership token record stored on-chain.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct MembershipToken {
    pub id: BytesN<32>,
    pub user: Address,
    pub status: MembershipStatus,
    pub issue_date: u64,
    pub expiry_date: u64,
    pub tier_id: Option<String>,
    pub grace_period_entered_at: Option<u64>,
    pub grace_period_expires_at: Option<u64>,
    pub renewal_attempts: u32,
    pub last_renewal_attempt_at: Option<u64>,
    pub current_version: u32,
}

#[contract]
pub struct MembershipTokenContract;

#[contractimpl]
impl MembershipTokenContract {
    /// Issue a new membership token.
    pub fn issue_token(
        env: Env,
        id: BytesN<32>,
        user: Address,
        expiry_date: u64,
    ) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::AdminNotSet)?;
        admin.require_auth();

        if env.storage().persistent().has(&DataKey::Token(id.clone())) {
            return Err(Error::TokenAlreadyIssued);
        }

        let current_time = env.ledger().timestamp();
        if expiry_date <= current_time {
            return Err(Error::InvalidExpiryDate);
        }

        let token = MembershipToken {
            id: id.clone(),
            user: user.clone(),
            status: MembershipStatus::Active,
            issue_date: current_time,
            expiry_date,
            tier_id: None,
            grace_period_entered_at: None,
            grace_period_expires_at: None,
            renewal_attempts: 0,
            last_renewal_attempt_at: None,
            current_version: 0,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Token(id.clone()), &token);
        env.storage().persistent().extend_ttl(
            &DataKey::Token(id),
            TOKEN_TTL_LEDGERS,
            TOKEN_TTL_LEDGERS,
        );

        Ok(())
    }

    /// Transfer a token to a new user.
    pub fn transfer_token(env: Env, id: BytesN<32>, new_user: Address) -> Result<(), Error> {
        let mut token: MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(id.clone()))
            .ok_or(Error::TokenNotFound)?;

        if token.status != MembershipStatus::Active {
            return Err(Error::TokenExpired);
        }

        token.user.require_auth();
        token.user = new_user;
        env.storage().persistent().set(&DataKey::Token(id.clone()), &token);
        env.storage().persistent().extend_ttl(
            &DataKey::Token(id),
            TOKEN_TTL_LEDGERS,
            TOKEN_TTL_LEDGERS,
        );

        Ok(())
    }

    /// Get a token by ID.
    pub fn get_token(env: Env, id: BytesN<32>) -> Result<MembershipToken, Error> {
        let token: MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(id))
            .ok_or(Error::TokenNotFound)?;

        let current_time = env.ledger().timestamp();
        if token.status == MembershipStatus::Active && current_time > token.expiry_date {
            return Err(Error::TokenExpired);
        }

        Ok(token)
    }

    /// Set the admin address.
    pub fn set_admin(env: Env, admin: Address) -> Result<(), Error> {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        Ok(())
    }

    /// Set metadata for a token.
    pub fn set_token_metadata(
        env: Env,
        token_id: BytesN<32>,
        description: String,
        attributes: Map<String, MetadataValue>,
    ) -> Result<(), Error> {
        let _token: MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(token_id.clone()))
            .ok_or(Error::TokenNotFound)?;

        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::AdminNotSet)?;
        token_user_auth(&env, &admin, &_token)?;

        let current_time = env.ledger().timestamp();
        let version = if let Some(existing) = env
            .storage()
            .persistent()
            .get::<DataKey, TokenMetadata>(&DataKey::Metadata(token_id.clone()))
        {
            existing.version + 1
        } else {
            1
        };

        let metadata = TokenMetadata {
            description,
            attributes,
            version,
            last_updated: current_time,
            updated_by: _token.user.clone(),
        };

        validate_metadata(&metadata).map_err(|_| Error::MetadataValidationFailed)?;

        env.storage()
            .persistent()
            .set(&DataKey::Metadata(token_id.clone()), &metadata);
        env.storage().persistent().extend_ttl(
            &DataKey::Metadata(token_id.clone()),
            TOKEN_TTL_LEDGERS,
            TOKEN_TTL_LEDGERS,
        );

        // Record history
        let update = MetadataUpdate {
            version,
            timestamp: current_time,
            updated_by: _token.user,
            description: metadata.description.clone(),
            changes: metadata.attributes.clone(),
        };
        let mut history: Vec<MetadataUpdate> = env
            .storage()
            .persistent()
            .get(&DataKey::MetadataHistory(token_id.clone()))
            .unwrap_or_else(|| Vec::new(&env));
        history.push_back(update);
        env.storage()
            .persistent()
            .set(&DataKey::MetadataHistory(token_id.clone()), &history);
        env.storage().persistent().extend_ttl(
            &DataKey::MetadataHistory(token_id),
            TOKEN_TTL_LEDGERS,
            TOKEN_TTL_LEDGERS,
        );

        Ok(())
    }

    /// Get metadata for a token.
    pub fn get_token_metadata(env: Env, token_id: BytesN<32>) -> Result<TokenMetadata, Error> {
        let _token: MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(token_id.clone()))
            .ok_or(Error::TokenNotFound)?;

        env.storage()
            .persistent()
            .get(&DataKey::Metadata(token_id))
            .ok_or(Error::MetadataNotFound)
    }

    /// Set renewal configuration.
    pub fn set_renewal_config(
        env: Env,
        grace_period_duration: u64,
        auto_renewal_notice_days: u64,
        renewals_enabled: bool,
    ) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::AdminNotSet)?;
        admin.require_auth();

        let config = RenewalConfig {
            grace_period_duration,
            auto_renewal_notice_days,
            renewals_enabled,
        };
        env.storage()
            .instance()
            .set(&DataKey::RenewalConfig, &config);
        Ok(())
    }

    /// Get renewal configuration.
    pub fn get_renewal_config(env: Env) -> RenewalConfig {
        env.storage()
            .instance()
            .get(&DataKey::RenewalConfig)
            .unwrap_or(RenewalConfig {
                grace_period_duration: 7 * 24 * 60 * 60,
                auto_renewal_notice_days: 24 * 60 * 60,
                renewals_enabled: true,
            })
    }

    /// Initiate emergency pause.
    pub fn emergency_pause(
        env: Env,
        admin: Address,
        reason: Option<String>,
        auto_unpause_after: Option<u64>,
        time_lock_duration: Option<u64>,
    ) -> Result<(), Error> {
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::AdminNotSet)?;
        if admin != stored_admin {
            return Err(Error::Unauthorized);
        }
        admin.require_auth();

        let current_time = env.ledger().timestamp();
        let mut state = get_pause_state(&env);

        state.is_paused = true;
        state.paused_at = Some(current_time);
        state.paused_by = Some(admin.clone());
        state.reason = reason;
        state.auto_unpause_at = auto_unpause_after.and_then(|s| current_time.checked_add(s));
        state.time_lock_until = time_lock_duration.and_then(|s| current_time.checked_add(s));
        state.pause_count = state.pause_count.saturating_add(1);

        env.storage()
            .instance()
            .set(&DataKey::EmergencyPauseState, &state);
        Ok(())
    }

    /// Lift emergency pause.
    pub fn emergency_unpause(env: Env, admin: Address) -> Result<(), Error> {
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::AdminNotSet)?;
        if admin != stored_admin {
            return Err(Error::Unauthorized);
        }
        admin.require_auth();

        let mut state = get_pause_state(&env);
        state.is_paused = false;
        state.paused_at = None;
        state.paused_by = None;
        state.reason = None;
        state.auto_unpause_at = None;
        state.time_lock_until = None;

        env.storage()
            .instance()
            .set(&DataKey::EmergencyPauseState, &state);
        Ok(())
    }

    /// Check if contract is paused.
    pub fn is_contract_paused(env: Env) -> bool {
        let state = get_pause_state(&env);
        if state.is_paused {
            if let Some(auto_at) = state.auto_unpause_at {
                if env.ledger().timestamp() >= auto_at {
                    return false;
                }
            }
            return true;
        }
        false
    }

    /// Get emergency pause state.
    pub fn get_emergency_pause_state(env: Env) -> EmergencyPauseState {
        get_pause_state(&env)
    }
}

fn get_pause_state(env: &Env) -> EmergencyPauseState {
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

fn token_user_auth(_env: &Env, admin: &Address, token: &MembershipToken) -> Result<(), Error> {
    let is_admin = admin.clone() == token.user.clone();
    if !is_admin {
        token.user.require_auth();
    } else {
        admin.require_auth();
    }
    Ok(())
}
